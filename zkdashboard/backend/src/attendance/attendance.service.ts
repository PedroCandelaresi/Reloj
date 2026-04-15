import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AttendanceRecord } from './attendance.entity';
import { Employee } from '../employees/employee.entity';

export interface AttendanceUserOption {
  userId: string;
  employee: Pick<Employee, 'id' | 'nombre' | 'apellido'> | null;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly repo: Repository<AttendanceRecord>,
  ) {}

  async saveRecords(records: Partial<AttendanceRecord>[]): Promise<void> {
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

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());

    const [totalToday, totalWeek, totalAll] = await Promise.all([
      this.repo.count({ where: { timestamp: Between(todayStart, new Date()) } }),
      this.repo.count({ where: { timestamp: Between(weekStart, new Date()) } }),
      this.repo.count(),
    ]);

    return { totalToday, totalWeek, totalAll };
  }

  async findAll(opts: {
    page: number;
    limit: number;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { page, limit, userId, dateFrom, dateTo } = opts;
    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndMapOne('r.employee', Employee, 'e', 'e.id = r.user_id');

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

  async getDistinctUsers(): Promise<AttendanceUserOption[]> {
    const rows = await this.repo
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
      .addOrderBy('r.user_id', 'ASC')
      .getRawMany();

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

  async getRecent(limit = 20): Promise<AttendanceRecord[]> {
    return this.repo
      .createQueryBuilder('r')
      .leftJoinAndMapOne('r.employee', Employee, 'e', 'e.id = r.user_id')
      .orderBy('r.timestamp', 'DESC')
      .take(limit)
      .getMany();
  }
}
