import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AdmsModule } from './adms/adms.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DevicesModule } from './devices/devices.module';
import { UsersModule } from './users/users.module';
import { AttendanceRecord } from './attendance/attendance.entity';
import { Device } from './devices/device.entity';
import { DeviceCommand } from './devices/device-command.entity';
import { AdminUser } from './users/admin-user.entity';
import { Employee } from './employees/employee.entity';
import { EmployeesModule } from './employees/employees.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'zkuser'),
        password: config.get('DB_PASSWORD', 'zkpassword'),
        database: config.get('DB_NAME', 'zkdashboard'),
        entities: [AttendanceRecord, Device, DeviceCommand, AdminUser, Employee],
        synchronize: true, // solo para desarrollo; en producción usar migraciones
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    DevicesModule,
    EmployeesModule,
    AttendanceModule,
    AdmsModule,
  ],
})
export class AppModule {}
