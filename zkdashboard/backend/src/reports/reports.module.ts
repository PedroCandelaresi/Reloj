import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from '../attendance/attendance.entity';
import { AttendanceAuditLog } from '../attendance/entities/attendance-audit-log.entity';
import { AttendanceRequest } from '../attendance/entities/attendance-request.entity';
import { AttendanceJustificationType } from '../attendance/entities/attendance-justification-type.entity';
import { AttendanceRequestAttachment } from '../attendance/entities/attendance-request-attachment.entity';
import { Employee } from '../employees/employee.entity';
import { AdminUser } from '../users/admin-user.entity';
import { ReportsController } from './reports.controller';
import { ReportsExcelExporter } from './exporters/reports-excel.exporter';
import { DailyPresenceService } from './services/daily-presence.service';
import { IncompleteRecordsService } from './services/incomplete-records.service';
import { MonthlySummaryService } from './services/monthly-summary.service';
import { PairingService } from './services/pairing.service';
import { ReportQueryService } from './services/report-query.service';
import { AttendanceDaySummary } from '../attendance/entities/attendance-day-summary.entity';
import { ScheduleProfile } from '../companies/schedule-profile.entity';
import { Company } from '../companies/company.entity';
import { Phase2ReportsService } from './services/phase2-reports.service';
import { HrControlReportsService } from './services/hr-control-reports.service';
import { MonthlyClosingService } from './services/monthly-closing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceRecord,
      AttendanceDaySummary,
      AttendanceRequest,
      AttendanceAuditLog,
      AttendanceJustificationType,
      AttendanceRequestAttachment,
      Employee,
      Company,
      ScheduleProfile,
      AdminUser,
    ]),
  ],
  controllers: [ReportsController],
  providers: [
    ReportsExcelExporter,
    DailyPresenceService,
    IncompleteRecordsService,
    MonthlySummaryService,
    PairingService,
    ReportQueryService,
    Phase2ReportsService,
    HrControlReportsService,
    MonthlyClosingService,
  ],
  exports: [PairingService],
})
export class ReportsModule {}
