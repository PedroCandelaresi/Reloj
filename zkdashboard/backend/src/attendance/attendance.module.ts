import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from './attendance.entity';
import { AttendanceDaySummary } from './entities/attendance-day-summary.entity';
import { AttendanceRequest } from './entities/attendance-request.entity';
import { AttendanceJustificationType } from './entities/attendance-justification-type.entity';
import { AttendanceRequestAttachment } from './entities/attendance-request-attachment.entity';
import { AttendanceAuditLog } from './entities/attendance-audit-log.entity';
import { Holiday } from './entities/holiday.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceCalculationService } from './attendance-calculation.service';
import { AttendanceRequestsService } from './attendance-requests.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceRequestsController } from './attendance-requests.controller';
import { HolidaysController } from './holidays.controller';
import { HolidaysService } from './holidays.service';
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
      AttendanceRequest,
      AttendanceJustificationType,
      AttendanceRequestAttachment,
      AttendanceAuditLog,
      Holiday,
      Employee,
      Device,
      DeviceCommand,
      InboundRequest,
      Company,
      ScheduleProfile,
    ]),
    DevicesModule,
  ],
  providers: [
    AttendanceService,
    ExportService,
    AttendanceCalculationService,
    AttendanceRequestsService,
    HolidaysService,
    PairingService,
  ],
  controllers: [AttendanceController, AttendanceRequestsController, HolidaysController],
  exports: [AttendanceService, AttendanceCalculationService],
})
export class AttendanceModule {}
