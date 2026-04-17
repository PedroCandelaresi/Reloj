import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AttendanceRecord } from '../attendance/attendance.entity';
import { CompanyMembership } from '../companies/company-membership.entity';
import { Company } from '../companies/company.entity';
import { Device } from '../devices/device.entity';
import { DeviceCommand } from '../devices/device-command.entity';
import { Employee } from '../employees/employee.entity';
import { AdminUser } from '../users/admin-user.entity';

dotenv.config();

export const DATABASE_ENTITIES = [
  AttendanceRecord,
  Company,
  CompanyMembership,
  Device,
  DeviceCommand,
  AdminUser,
  Employee,
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
