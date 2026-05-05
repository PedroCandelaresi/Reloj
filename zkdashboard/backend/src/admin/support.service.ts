import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, IsNull, In } from 'typeorm';
import { Device } from '../devices/device.entity';
import { DeviceCommand } from '../devices/device-command.entity';
import { Company } from '../companies/company.entity';
import { InboundRequest } from '../adms/inbound-request.entity';
import { Employee } from '../employees/employee.entity';
import { AttendanceRecalculationLog } from './entities/attendance-recalculation-log.entity';
import { AttendanceRecalculationLog as RecalcLog } from './entities/attendance-recalculation-log.entity';

const DEFAULT_ONLINE_THRESHOLD_MS = 300_000; // 5 minutes
const DEFAULT_IDLE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export interface SupportOverview {
  global: {
    totalCompanies: number;
    activeCompanies: number;
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    neverSeenDevices: number;
    deviceStates: Record<string, number>;
  };
  commands: {
    pendingCount: number;
    failedCount: number;
    expiredCount: number;
    recentFailed: Array<{
      id: number;
      deviceId: number;
      deviceSn: string;
      command: string;
      status: string;
      error: string | null;
      failedAt: Date | null;
    }>;
  };
  communication: {
    lastInboundRequestAt: Date | null;
    totalInboundRequests24h: number;
    failedRequests24h: number;
    avgResponseTime: number | null;
  };
  recalculation: {
    running: number;
    failed: number;
    recentFailed: Array<{
      id: string;
      companyId: string;
      dateFrom: string;
      dateTo: string;
      errorMessage: string | null;
      createdAt: Date;
    }>;
  };
  issues: string[];
}

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(Device)
    private readonly devicesRepo: Repository<Device>,
    @InjectRepository(DeviceCommand)
    private readonly commandsRepo: Repository<DeviceCommand>,
    @InjectRepository(Company)
    private readonly companiesRepo: Repository<Company>,
    @InjectRepository(InboundRequest)
    private readonly inboundRequestsRepo: Repository<InboundRequest>,
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
    @InjectRepository(RecalcLog)
    private readonly recalcLogsRepo: Repository<RecalcLog>,
  ) {}

  async getOverview(): Promise<SupportOverview> {
    const now = new Date();
    const onlineThresholdMs = DEFAULT_ONLINE_THRESHOLD_MS;
    const idleThresholdMs = DEFAULT_IDLE_THRESHOLD_MS;

    // ─── Global State ─────────────────────────────────────────────────────────

    const [totalCompanies, activeCompanies, allDevices] = await Promise.all([
      this.companiesRepo.count(),
      this.companiesRepo.count({ where: { isActive: true } }),
      this.devicesRepo.find(),
    ]);

    const deviceStates: Record<string, number> = {
      online: 0,
      idle: 0,
      offline: 0,
      never_seen: 0,
      disabled: 0,
    };

    let onlineDevices = 0;
    let offlineDevices = 0;
    let neverSeenDevices = 0;

    for (const device of allDevices) {
      if (!device.isActive) {
        deviceStates.disabled++;
        continue;
      }

      const lastSeen = device.lastSeen;
      if (!lastSeen) {
        deviceStates.never_seen++;
        neverSeenDevices++;
        continue;
      }

      const ageMs = now.getTime() - new Date(lastSeen).getTime();
      if (ageMs <= onlineThresholdMs) {
        deviceStates.online++;
        onlineDevices++;
      } else if (ageMs <= idleThresholdMs) {
        deviceStates.idle++;
      } else {
        deviceStates.offline++;
        offlineDevices++;
      }
    }

    // ─── Commands ──────────────────────────────────────────────────────────

    const [pendingCommands, failedCommands, expiredCommands] = await Promise.all([
      this.commandsRepo.count({ where: { status: 'pending' } }),
      this.commandsRepo.count({ where: { status: 'failed' } }),
      this.commandsRepo.count({ where: { status: 'expired' } }),
    ]);

    const recentFailedCommands = await this.commandsRepo
      .createQueryBuilder('cmd')
      .leftJoinAndSelect('cmd.device', 'device')
      .where('cmd.status IN (:...statuses)', { statuses: ['failed', 'expired'] })
      .orderBy('cmd.failed_at', 'DESC')
      .take(10)
      .getMany();

    const recentFailedFormatted = recentFailedCommands.map((cmd) => ({
      id: cmd.id,
      deviceId: cmd.deviceId,
      deviceSn: cmd.device?.serialNumber ?? '—',
      command: cmd.command,
      status: cmd.status,
      error: cmd.errorMessage,
      failedAt: cmd.failedAt,
    }));

    // ─── Communication ───────────────────────────────────────────────────────

    const last24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [lastInboundRequest, inboundCount, failedInboundCount] = await Promise.all([
      this.inboundRequestsRepo.findOne({
        where: {},
        order: { receivedAt: 'DESC' },
      }),
      this.inboundRequestsRepo.count({
        where: { receivedAt: Between(last24hStart, now) },
      }),
      this.inboundRequestsRepo.count({
        where: {
          receivedAt: Between(last24hStart, now),
          processedOk: false,
        },
      }),
    ]);

    let avgResponseTime: number | null = null;
    const successfulRequests = await this.inboundRequestsRepo
      .createQueryBuilder('req')
      .select('req.response_status', 'status')
      .addSelect('EXTRACT(EPOCH FROM (req.received_at)) * 1000', 'time')
      .where('req.processed_ok = true')
      .andWhere('req.received_at >= :start', { start: last24hStart })
      .limit(100)
      .getRawMany();

    if (successfulRequests.length > 0) {
      const avgTime = successfulRequests.reduce((sum, r) => sum + (r.time ?? 0), 0) / successfulRequests.length;
      avgResponseTime = Math.round(avgTime);
    }

    // ─── Recalculation ────────────────────────────────────────────────────────

    const [runningRecalcs, recentFailedRecalcs] = await Promise.all([
      this.recalcLogsRepo.count({ where: { status: 'running' } }),
      this.recalcLogsRepo.find({
        where: { status: 'failed' },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
    ]);

    // ─── Issues ───────────────────────────────────────────────────────────────

    const issues: string[] = [];

    if (offlineDevices > 0) {
      issues.push(`${offlineDevices} dispositivo(s) sin conexión.`);
    }
    if (neverSeenDevices > 0) {
      issues.push(`${neverSeenDevices} dispositivo(s) nunca conectado(s).`);
    }
    if (pendingCommands > 0) {
      issues.push(`${pendingCommands} comando(s) pendiente(s).`);
    }
    if (failedCommands > 0) {
      issues.push(`${failedCommands} comando(s) fallido(s).`);
    }
    if (runningRecalcs > 0) {
      issues.push(`${runningRecalcs} recálculo(s) en ejecución.`);
    }
    if (recentFailedRecalcs.length > 0) {
      issues.push(`${recentFailedRecalcs.length} recálculo(s) fallido(s) recientemente.`);
    }

    // Check companies without devices
    const companiesWithDevices = new Set(allDevices.map((d) => d.companyId).filter(Boolean));
    const activeCompaniesCount = await this.companiesRepo.count({ where: { isActive: true } });
    const companiesWithoutDevices = activeCompaniesCount - companiesWithDevices.size;
    if (companiesWithoutDevices > 0) {
      issues.push(`${companiesWithoutDevices} empresa(s) sin reloj(es).`);
    }

    return {
      global: {
        totalCompanies,
        activeCompanies,
        totalDevices: allDevices.length,
        onlineDevices,
        offlineDevices,
        neverSeenDevices,
        deviceStates,
      },
      commands: {
        pendingCount: pendingCommands,
        failedCount: failedCommands,
        expiredCount: expiredCommands,
        recentFailed: recentFailedFormatted,
      },
      communication: {
        lastInboundRequestAt: lastInboundRequest?.receivedAt ?? null,
        totalInboundRequests24h: inboundCount,
        failedRequests24h: failedInboundCount,
        avgResponseTime,
      },
      recalculation: {
        running: runningRecalcs,
        failed: recentFailedRecalcs.length,
        recentFailed: recentFailedRecalcs.map((log) => ({
          id: log.id,
          companyId: log.companyId,
          dateFrom: log.dateFrom,
          dateTo: log.dateTo,
          errorMessage: log.errorMessage,
          createdAt: log.createdAt,
        })),
      },
      issues: issues.length === 0 ? ['Sin problemas reportados.'] : issues,
    };
  }

  async getDevicesByState(state: string): Promise<Device[]> {
    const now = new Date();
    const onlineThresholdMs = DEFAULT_ONLINE_THRESHOLD_MS;
    const idleThresholdMs = DEFAULT_IDLE_THRESHOLD_MS;

    const devices = await this.devicesRepo.find({
      relations: { company: true },
      order: { lastSeen: 'DESC' },
    });

    if (state === 'all') return devices;

    return devices.filter((device) => {
      if (!device.isActive && state === 'disabled') return true;
      if (!device.isActive) return false;

      const lastSeen = device.lastSeen;
      if (!lastSeen && state === 'never_seen') return true;
      if (!lastSeen) return false;

      const ageMs = now.getTime() - new Date(lastSeen).getTime();
      if (state === 'online' && ageMs <= onlineThresholdMs) return true;
      if (state === 'idle' && ageMs > onlineThresholdMs && ageMs <= idleThresholdMs) return true;
      if (state === 'offline' && ageMs > idleThresholdMs) return true;

      return false;
    });
  }

  async getCompanyDevicesStatus(companyId: string): Promise<{
    company: Company;
    devices: Device[];
    summary: {
      total: number;
      online: number;
      offline: number;
    };
  }> {
    const company = await this.companiesRepo.findOneByOrFail({ id: companyId });
    const devices = await this.devicesRepo.find({
      where: { companyId },
      order: { lastSeen: 'DESC' },
    });

    const now = new Date();
    const onlineThresholdMs = DEFAULT_ONLINE_THRESHOLD_MS;
    let online = 0;

    for (const device of devices) {
      if (!device.isActive) continue;
      if (!device.lastSeen) continue;
      const ageMs = now.getTime() - new Date(device.lastSeen).getTime();
      if (ageMs <= onlineThresholdMs) online++;
    }

    return {
      company,
      devices,
      summary: {
        total: devices.length,
        online,
        offline: devices.length - online,
      },
    };
  }
}
