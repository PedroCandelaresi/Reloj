import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AttendanceRecord } from '../attendance/attendance.entity';
import { AttendanceAuditLog } from '../attendance/entities/attendance-audit-log.entity';
import { AttendanceDaySummary } from '../attendance/entities/attendance-day-summary.entity';
import { AttendanceJustificationType } from '../attendance/entities/attendance-justification-type.entity';
import { AttendanceRequest } from '../attendance/entities/attendance-request.entity';
import { AttendanceRequestAttachment } from '../attendance/entities/attendance-request-attachment.entity';
import { Holiday } from '../attendance/entities/holiday.entity';
import { InboundRequest } from '../adms/inbound-request.entity';
import { CompanyMembership } from '../companies/company-membership.entity';
import { Company } from '../companies/company.entity';
import { ScheduleProfile } from '../companies/schedule-profile.entity';
import { ScheduleProfileDayInterval } from '../companies/schedule-profile-day-interval.entity';
import { ScheduleProfileDayRule } from '../companies/schedule-profile-day-rule.entity';
import { Device } from '../devices/device.entity';
import { AdminConfigAuditLog } from '../admin/entities/admin-config-audit-log.entity';
import { AttendanceRecalculationLog } from '../admin/entities/attendance-recalculation-log.entity';
import { DeviceCommand } from '../devices/device-command.entity';
import { DeviceUserSnapshot } from '../devices/device-user-snapshot.entity';
import { Department } from '../employees/department.entity';
import { Employee } from '../employees/employee.entity';
import { EmployeeTimeBankLedger } from '../employees/employee-time-bank-ledger.entity';
import { Position } from '../employees/position.entity';
import { AdminUser } from '../users/admin-user.entity';

dotenv.config();

export const DATABASE_ENTITIES = [
  InboundRequest,
  AttendanceRecord,
  AttendanceDaySummary,
  AttendanceRequest,
  AttendanceRequestAttachment,
  AttendanceJustificationType,
  AttendanceAuditLog,
  Holiday,
  Company,
  CompanyMembership,
  ScheduleProfile,
  ScheduleProfileDayRule,
  ScheduleProfileDayInterval,
  Device,
  DeviceCommand,
  DeviceUserSnapshot,
  AdminConfigAuditLog,
  AttendanceRecalculationLog,
  AdminUser,
  Department,
  Position,
  Employee,
  EmployeeTimeBankLedger,
];

function parsePort(rawValue: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(rawValue || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(rawValue: string | undefined, fallback = false): boolean {
  if (typeof rawValue !== 'string') {
    return fallback;
  }

  switch (rawValue.trim().toLowerCase()) {
    case '1':
    case 'true':
    case 'yes':
    case 'on':
      return true;
    case '0':
    case 'false':
    case 'no':
    case 'off':
      return false;
    default:
      return fallback;
  }
}

export function buildDatabaseOptions(
  env: Record<string, string | undefined> = process.env,
): DataSourceOptions {
  const nodeEnv = env.NODE_ENV || 'development';
  const allowSynchronize = parseBoolean(env.DB_SYNCHRONIZE, false);

  return {
    type: 'postgres',
    host: env.DB_HOST || 'localhost',
    port: parsePort(env.DB_PORT, 5432),
    username: env.DB_USERNAME || 'zkuser',
    password: env.DB_PASSWORD || 'zkpassword',
    database: env.DB_NAME || 'zkdashboard',
    entities: DATABASE_ENTITIES,
    migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
    migrationsTableName: 'migrations',
    synchronize: nodeEnv !== 'production' && allowSynchronize,
    logging: parseBoolean(env.DB_LOGGING, false),
  };
}

const AppDataSource = new DataSource(buildDatabaseOptions(process.env));

export default AppDataSource;
