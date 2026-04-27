import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { AttendanceRecord } from './attendance.entity';
import { Employee } from '../employees/employee.entity';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { getCompanyScope } from '../auth/company-scope.util';
import { DevicesService } from '../devices/devices.service';

export interface AttendanceUserOption {
  userId: string;
  employee: Pick<Employee, 'id' | 'nombre' | 'apellido'> | null;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly repo: Repository<AttendanceRecord>,
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
    private readonly devices: DevicesService,
  ) {}

  async saveRecords(records: Partial<AttendanceRecord>[]): Promise<void> {
    const userIds = [
      ...new Set(
        records
          .map((record) => record.userId)
          .filter((userId): userId is string => typeof userId === 'string' && userId.trim() !== ''),
      ),
    ];
    const companyByUserId = new Map<string, string | null>();

    for (const record of records) {
      if (!record.userId || companyByUserId.has(record.userId)) {
        continue;
      }

      companyByUserId.set(record.userId, record.companyId ?? null);
    }

    if (userIds.length > 0) {
      const existingEmployees = await this.employeesRepo.findBy({ id: In(userIds) });
      const existingIds = new Set(existingEmployees.map((employee) => employee.id));
      const missingIds = userIds.filter((userId) => !existingIds.has(userId));

      if (missingIds.length > 0) {
        await this.employeesRepo
          .createQueryBuilder()
          .insert()
          .into(Employee)
          .values(
            missingIds.map((id) => ({
              id,
              nombre: '',
              apellido: '',
              telefono: null,
              email: null,
              companyId: companyByUserId.get(id) ?? null,
            })),
          )
          .orIgnore()
          .execute();
      }

      const employeesToUpdate = existingEmployees
        .filter((employee) => !employee.companyId && companyByUserId.get(employee.id))
        .map((employee) => {
          employee.companyId = companyByUserId.get(employee.id) ?? null;
          return employee;
        });

      for (const employee of existingEmployees) {
        const recordCompanyId = companyByUserId.get(employee.id);
        if (!recordCompanyId || !employee.companyId || employee.companyId === recordCompanyId) {
          continue;
        }

        this.logger.warn(
          `Marcación recibida para ${employee.id} en empresa ${recordCompanyId}, pero el empleado ya pertenece a ${employee.companyId}.`,
        );
      }

      if (employeesToUpdate.length > 0) {
        await this.employeesRepo.save(employeesToUpdate);
      }
    }

    for (const record of records) {
      const exists = await this.repo.findOne({
        where: {
          deviceSn: record.deviceSn,
          userId: record.userId,
          timestamp: record.timestamp,
        },
      });
      if (!exists) {
        await this.repo.save(record);
      }
    }
  }

  async getStats(user: AuthenticatedUser) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());

    const [totalToday, totalWeek, totalAll] = await Promise.all([
      this.getScopedCount(user, todayStart, now),
      this.getScopedCount(user, weekStart, now),
      this.getScopedCount(user),
    ]);

    return { totalToday, totalWeek, totalAll };
  }

  async getDashboardSummary(user: AuthenticatedUser) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const recordsTodayQb = this.repo.createQueryBuilder('r');
    const presentTodayQb = this.repo.createQueryBuilder('r');

    recordsTodayQb.andWhere('r.timestamp BETWEEN :from AND :to', {
      from: todayStart,
      to: now,
    });
    presentTodayQb
      .select('COUNT(DISTINCT r.user_id)', 'count')
      .andWhere('r.timestamp BETWEEN :from AND :to', {
        from: todayStart,
        to: now,
      });

    this.applyCompanyScope(recordsTodayQb, user);
    this.applyCompanyScope(presentTodayQb, user);

    const [recordsToday, presentRow, deviceMetrics] = await Promise.all([
      recordsTodayQb.getCount(),
      presentTodayQb.getRawOne<{ count: string }>(),
      this.devices.getDashboardMetrics(user),
    ]);

    return {
      presentToday: Number.parseInt(presentRow?.count || '0', 10),
      recordsToday,
      devicesOnline: deviceMetrics.onlineCount,
      devicesOffline: deviceMetrics.offlineCount,
      lastSyncAt: deviceMetrics.lastSyncAt,
      technicalNews: deviceMetrics.technicalNews,
    };
  }

  async findAll(opts: {
    user: AuthenticatedUser;
    page: number;
    limit: number;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { page, limit, user, userId, dateFrom, dateTo } = opts;
    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndMapOne('r.employee', Employee, 'e', 'e.id = r.user_id');

    this.applyCompanyScope(qb, user);

    if (userId) {
      qb.andWhere('r.user_id = :userId', { userId });
    }
    if (dateFrom) {
      qb.andWhere('r.timestamp >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setDate(to.getDate() + 1);
      qb.andWhere('r.timestamp < :dateTo', { dateTo: to });
    }

    qb.orderBy('r.timestamp', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getDistinctUsers(user: AuthenticatedUser): Promise<AttendanceUserOption[]> {
    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoin(Employee, 'e', 'e.id = r.user_id')
      .select('r.user_id', 'userId')
      .addSelect('e.id', 'employeeId')
      .addSelect('e.nombre', 'employeeNombre')
      .addSelect('e.apellido', 'employeeApellido')
      .groupBy('r.user_id')
      .addGroupBy('e.id')
      .addGroupBy('e.nombre')
      .addGroupBy('e.apellido')
      .orderBy('COALESCE(e.apellido, r.user_id)', 'ASC')
      .addOrderBy('e.nombre', 'ASC', 'NULLS LAST')
      .addOrderBy('r.user_id', 'ASC');

    this.applyCompanyScope(qb, user);

    const rows = await qb.getRawMany();

    return rows.map((row) => ({
      userId: row.userId,
      employee: row.employeeId
        ? {
            id: row.employeeId,
            nombre: row.employeeNombre,
            apellido: row.employeeApellido,
          }
        : null,
    }));
  }

  async getRecent(user: AuthenticatedUser, limit = 20): Promise<AttendanceRecord[]> {
    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndMapOne('r.employee', Employee, 'e', 'e.id = r.user_id')
      .orderBy('r.timestamp', 'DESC')
      .take(limit);

    this.applyCompanyScope(qb, user);

    return qb.getMany();
  }

  private applyCompanyScope(
    qb: SelectQueryBuilder<AttendanceRecord>,
    user: AuthenticatedUser,
  ): void {
    const companyId = getCompanyScope(user);

    if (companyId) {
      qb.andWhere('r.company_id = :companyId', { companyId });
    }
  }

  private getScopedCount(
    user: AuthenticatedUser,
    from?: Date,
    to?: Date,
  ): Promise<number> {
    const qb = this.repo.createQueryBuilder('r');

    if (from && to) {
      qb.andWhere('r.timestamp BETWEEN :from AND :to', { from, to });
    }

    this.applyCompanyScope(qb, user);
    return qb.getCount();
  }
}
