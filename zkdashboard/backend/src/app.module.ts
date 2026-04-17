import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AdmsModule } from './adms/adms.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DevicesModule } from './devices/devices.module';
import { UsersModule } from './users/users.module';
import { EmployeesModule } from './employees/employees.module';
import { buildDatabaseOptions } from './database/data-source';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) =>
        buildDatabaseOptions({
          NODE_ENV: config.get<string>('NODE_ENV'),
          DB_HOST: config.get<string>('DB_HOST'),
          DB_PORT: config.get<string>('DB_PORT'),
          DB_USERNAME: config.get<string>('DB_USERNAME'),
          DB_PASSWORD: config.get<string>('DB_PASSWORD'),
          DB_NAME: config.get<string>('DB_NAME'),
          DB_SYNCHRONIZE: config.get<string>('DB_SYNCHRONIZE'),
          DB_LOGGING: config.get<string>('DB_LOGGING'),
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
