import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from './attendance.entity';
import { AttendanceDaySummary } from './entities/attendance-day-summary.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceCalculationService } from './attendance-calculation.service';
import { AttendanceController } from './attendance.controller';
import { ExportService } from './export.service';
import { DevicesModule } from '../devices/devices.module';
import { PairingService } from '../reports/services/pairing.service';
import { Employee } from '../employees/employee.entity';
import { Device } from '../devices/device.entity';
import { DeviceCommand } from '../devices/device-command.entity';
import { InboundRequest } from '../adms/inbound-request.entity';
import { Company } from '../companies/company.entity';
import { ScheduleProfile } from '../companies/schedule-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceRecord,
      AttendanceDaySummary,
      Employee,
      Device,
      DeviceCommand,
      InboundRequest,
      Company,
      ScheduleProfile,
    ]),
    DevicesModule,
  ],
  providers: [AttendanceService, ExportService, AttendanceCalculationService, PairingService],
  controllers: [AttendanceController],
  exports: [AttendanceService, AttendanceCalculationService],
})
export class AttendanceModule {}
