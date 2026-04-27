import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { InboundRequest } from '../adms/inbound-request.entity';
import { AttendanceRecord } from '../attendance/attendance.entity';
import { Company } from '../companies/company.entity';
import { DEVICE_COMMAND_STATUSES, DeviceCommand } from '../devices/device-command.entity';
import { Device } from '../devices/device.entity';
import { Employee } from '../employees/employee.entity';
import { AdminUser } from '../users/admin-user.entity';

const DEFAULT_ONLINE_THRESHOLD_MS = 300_000;

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepo: Repository<Company>,
    @InjectRepository(AdminUser)
    private readonly usersRepo: Repository<AdminUser>,
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
    @InjectRepository(Device)
    private readonly devicesRepo: Repository<Device>,
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepo: Repository<AttendanceRecord>,
    @InjectRepository(DeviceCommand)
    private readonly commandsRepo: Repository<DeviceCommand>,
    @InjectRepository(InboundRequest)
    private readonly inboundRepo: Repository<InboundRequest>,
  ) {}

  async getGlobalDashboard() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysStart = new Date(todayStart);
    sevenDaysStart.setDate(todayStart.getDate() - 6);

    const [
      totalCompanies,
      activeCompanies,
      totalUsers,
      totalEmployees,
      devices,
      totalAttendanceToday,
      attendanceCompanyNull,
      pendingCommands,
      attendanceLast7Days,
      latestDevices,
      latestCompanies,
      latestAdmsErrors,
      topCompaniesToday,
    ] = await Promise.all([
      this.companiesRepo.count(),
      this.companiesRepo.countBy({ isActive: true }),
      this.usersRepo.count(),
      this.employeesRepo.count(),
      this.devicesRepo.find({ relations: { company: true } }),
      this.attendanceRepo
        .createQueryBuilder('record')
        .where('record.timestamp BETWEEN :from AND :to', { from: todayStart, to: now })
        .getCount(),
      this.attendanceRepo.countBy({ companyId: IsNull() }),
      this.commandsRepo.countBy({ status: DEVICE_COMMAND_STATUSES.PENDING }),
      this.getAttendanceLast7Days(sevenDaysStart, now),
      this.getLatestDevices(),
      this.getLatestCompanies(),
      this.getLatestAdmsErrors(),
      this.getTopCompaniesToday(todayStart, now),
    ]);

    const devicesOnline = devices.filter((device) => this.isOnline(device.lastSeen)).length;
    const offlineDevices = devices.filter((device) => !this.isOnline(device.lastSeen));
    const unassignedDevices = devices.filter((device) => !device.companyId).length;

    return {
      summary: {
        totalCompanies,
        activeCompanies,
        totalUsers,
        totalEmployees,
        totalDevices: devices.length,
        devicesOnline,
        devicesOffline: offlineDevices.length,
        unassignedDevices,
        totalAttendanceToday,
        attendanceLast7Days,
        attendanceCompanyNull,
        pendingCommands,
      },
      latestDevices,
      latestCompanies,
      latestAdmsErrors,
      companiesWithOfflineDevices: this.groupOfflineDevicesByCompany(offlineDevices),
      topCompaniesToday,
      technicalAlerts: this.buildTechnicalAlerts({
        offlineDevices: offlineDevices.length,
        unassignedDevices,
        attendanceCompanyNull,
        pendingCommands,
        admsErrors: latestAdmsErrors.length,
      }),
    };
  }

  private getOnlineThresholdMs(): number {
    const parsed = Number.parseInt(process.env.DEVICE_ONLINE_THRESHOLD_MS || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ONLINE_THRESHOLD_MS;
  }

  private isOnline(lastSeen?: Date | null): boolean {
    if (!lastSeen) {
      return false;
    }

    return Date.now() - new Date(lastSeen).getTime() <= this.getOnlineThresholdMs();
  }

  private async getAttendanceLast7Days(from: Date, to: Date) {
    const rows = await this.attendanceRepo.query(
      `
        SELECT DATE("timestamp") AS "date", COUNT(*)::int AS "count"
        FROM "attendance_records"
        WHERE "timestamp" BETWEEN $1 AND $2
        GROUP BY DATE("timestamp")
        ORDER BY DATE("timestamp") ASC
      `,
      [from, to],
    );

    return rows.map((row: { date: string | Date; count: number }) => ({
      date: new Date(row.date).toISOString().slice(0, 10),
      count: Number(row.count),
    }));
  }

  private async getLatestDevices() {
    const devices = await this.devicesRepo.find({
      relations: { company: true },
      order: { lastSeen: 'DESC', serialNumber: 'ASC' },
      take: 8,
    });

    return devices.map((device) => ({
      id: device.id,
      name: device.alias || device.serialNumber,
      serialNumber: device.serialNumber,
      companyId: device.companyId,
      companyName:
        device.company?.nombreFantasia || device.company?.razonSocial || null,
      lastSeen: device.lastSeen,
      online: this.isOnline(device.lastSeen),
    }));
  }

  private async getLatestCompanies() {
    const companies = await this.companiesRepo.find({
      order: { createdAt: 'DESC' },
      take: 6,
    });

    return companies.map((company) => ({
      id: company.id,
      cuit: company.cuit,
      razonSocial: company.razonSocial,
      nombreFantasia: company.nombreFantasia,
      isActive: company.isActive,
      createdAt: company.createdAt,
    }));
  }

  private async getLatestAdmsErrors() {
    const requests = await this.inboundRepo
      .createQueryBuilder('request')
      .where('request.processed_ok = false')
      .orWhere('request.response_status >= :status', { status: 400 })
      .orWhere('request.parse_error IS NOT NULL')
      .orderBy('request.received_at', 'DESC')
      .take(8)
      .getMany();

    return requests.map((request) => ({
      id: request.id,
      serialNumber: request.serialNumber,
      companyId: request.companyId,
      sourceIp: request.sourceIp,
      path: request.path,
      responseStatus: request.responseStatus,
      parseError: request.parseError,
      receivedAt: request.receivedAt,
    }));
  }

  private async getTopCompaniesToday(from: Date, to: Date) {
    const rows = await this.attendanceRepo.query(
      `
        SELECT
          company.id AS "companyId",
          company.razon_social AS "razonSocial",
          company.nombre_fantasia AS "nombreFantasia",
          COUNT(attendance.id)::int AS "count"
        FROM "attendance_records" attendance
        INNER JOIN "companies" company ON company.id = attendance.company_id
        WHERE attendance."timestamp" BETWEEN $1 AND $2
        GROUP BY company.id, company.razon_social, company.nombre_fantasia
        ORDER BY COUNT(attendance.id) DESC, company.razon_social ASC
        LIMIT 8
      `,
      [from, to],
    );

    return rows.map(
      (row: {
        companyId: string;
        razonSocial: string;
        nombreFantasia: string | null;
        count: number;
      }) => ({
        companyId: row.companyId,
        companyName: row.nombreFantasia || row.razonSocial,
        count: Number(row.count),
      }),
    );
  }

  private groupOfflineDevicesByCompany(devices: Device[]) {
    const grouped = new Map<
      string,
      {
        companyId: string | null;
        companyName: string;
        offlineDevices: number;
      }
    >();

    for (const device of devices) {
      const companyId = device.companyId ?? 'unassigned';
      const current =
        grouped.get(companyId) ??
        {
          companyId: device.companyId,
          companyName:
            device.company?.nombreFantasia ||
            device.company?.razonSocial ||
            'Sin empresa asignada',
          offlineDevices: 0,
        };

      current.offlineDevices += 1;
      grouped.set(companyId, current);
    }

    return [...grouped.values()].sort(
      (left, right) => right.offlineDevices - left.offlineDevices,
    );
  }

  private buildTechnicalAlerts(metrics: {
    offlineDevices: number;
    unassignedDevices: number;
    attendanceCompanyNull: number;
    pendingCommands: number;
    admsErrors: number;
  }) {
    const alerts: string[] = [];

    if (metrics.offlineDevices > 0) {
      alerts.push(`${metrics.offlineDevices} dispositivo(s) offline.`);
    }
    if (metrics.unassignedDevices > 0) {
      alerts.push(`${metrics.unassignedDevices} dispositivo(s) sin empresa asignada.`);
    }
    if (metrics.attendanceCompanyNull > 0) {
      alerts.push(`${metrics.attendanceCompanyNull} fichada(s) sin companyId.`);
    }
    if (metrics.pendingCommands > 0) {
      alerts.push(`${metrics.pendingCommands} comando(s) pendientes globales.`);
    }
    if (metrics.admsErrors > 0) {
      alerts.push(`${metrics.admsErrors} request(s) ADMS recientes con error.`);
    }

    return alerts.length > 0 ? alerts : ['Sin alertas técnicas relevantes.'];
  }
}
