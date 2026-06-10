import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecord } from '../../attendance/attendance.entity';
import { Employee } from '../../employees/employee.entity';
import { ReportFiltersDto } from '../dto/report-filters.dto';
import { PairingInputRecord } from '../types/report.types';
import { parseDateEnd, parseDateStart, timestampDateKey } from './report-date.util';

export interface EmployeeRecordGroup {
  employee: Employee;
  date: string;
  records: PairingInputRecord[];
}

@Injectable()
export class ReportQueryService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepo: Repository<AttendanceRecord>,
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
  ) {}

  async getEmployees(
    companyId: string | null,
    employeeId?: string,
    filters: Pick<ReportFiltersDto, 'departmentId' | 'positionId' | 'includeInactive'> = {},
  ): Promise<Employee[]> {
    const qb = this.employeesRepo.createQueryBuilder('employee');

    if (companyId) {
      qb.where('employee.company_id = :companyId', { companyId });
    } else {
      qb.where('1 = 1');
    }

    if (employeeId) {
      qb.andWhere('employee.id = :employeeId', { employeeId });
    }
    if (filters.includeInactive !== 'true') {
      qb.andWhere('employee.is_active = true');
    }
    if (filters.departmentId) {
      qb.andWhere('employee.department_id = :departmentId', { departmentId: filters.departmentId });
    }
    if (filters.positionId) {
      qb.andWhere('employee.position_id = :positionId', { positionId: filters.positionId });
    }

    qb.orderBy('employee.apellido', 'ASC').addOrderBy('employee.nombre', 'ASC').addOrderBy('employee.id', 'ASC');
    return qb.getMany();
  }

  async getRecordGroups(opts: {
    companyId: string | null;
    dateFrom: string;
    dateTo: string;
    filters?: Pick<ReportFiltersDto, 'employeeId' | 'userId' | 'deviceId'>;
  }): Promise<Map<string, Map<string, PairingInputRecord[]>>> {
    const qb = this.attendanceRepo
      .createQueryBuilder('record')
      .where('record.timestamp >= :dateFrom', { dateFrom: parseDateStart(opts.dateFrom) })
      .andWhere('record.timestamp <= :dateTo', { dateTo: parseDateEnd(opts.dateTo) });

    if (opts.companyId) {
      qb.andWhere('record.company_id = :companyId', { companyId: opts.companyId });
    }

    const userId = opts.filters?.employeeId || opts.filters?.userId;
    if (userId) {
      qb.andWhere('record.user_id = :userId', { userId });
    }

    if (opts.filters?.deviceId) {
      const parsedDeviceId = Number.parseInt(opts.filters.deviceId, 10);
      if (Number.isFinite(parsedDeviceId)) {
        qb.andWhere('record.device_id = :deviceId', { deviceId: parsedDeviceId });
      }
    }

    qb.orderBy('record.user_id', 'ASC').addOrderBy('record.timestamp', 'ASC');
    const records = await qb.getMany();
    const grouped = new Map<string, Map<string, PairingInputRecord[]>>();

    for (const record of records) {
      const userGroups = grouped.get(record.userId) ?? new Map<string, PairingInputRecord[]>();
      const dateKey = timestampDateKey(record.timestamp);
      const dayRecords = userGroups.get(dateKey) ?? [];
      dayRecords.push({
        timestamp: record.timestamp,
        deviceSn: record.deviceSn,
        deviceId: record.deviceId,
      });
      userGroups.set(dateKey, dayRecords);
      grouped.set(record.userId, userGroups);
    }

    return grouped;
  }
}
