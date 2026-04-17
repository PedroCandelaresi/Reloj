import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from './attendance.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { ExportService } from './export.service';
import { DevicesModule } from '../devices/devices.module';
import { Employee } from '../employees/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceRecord, Employee]), DevicesModule],
  providers: [AttendanceService, ExportService],
  controllers: [AttendanceController],
  exports: [AttendanceService],
})
export class AttendanceModule {}
