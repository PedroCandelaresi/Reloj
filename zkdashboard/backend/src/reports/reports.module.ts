import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from '../attendance/attendance.entity';
import { Employee } from '../employees/employee.entity';
import { ReportsController } from './reports.controller';
import { ReportsExcelExporter } from './exporters/reports-excel.exporter';
import { DailyPresenceService } from './services/daily-presence.service';
import { IncompleteRecordsService } from './services/incomplete-records.service';
import { MonthlySummaryService } from './services/monthly-summary.service';
import { PairingService } from './services/pairing.service';
import { ReportQueryService } from './services/report-query.service';
import { AttendanceDaySummary } from '../attendance/entities/attendance-day-summary.entity';
import { ScheduleProfile } from '../companies/schedule-profile.entity';
import { Phase2ReportsService } from './services/phase2-reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceRecord, AttendanceDaySummary, Employee, ScheduleProfile])],
  controllers: [ReportsController],
  providers: [
    ReportsExcelExporter,
    DailyPresenceService,
    IncompleteRecordsService,
    MonthlySummaryService,
    PairingService,
    ReportQueryService,
    Phase2ReportsService,
  ],
  exports: [PairingService],
})
export class ReportsModule {}
