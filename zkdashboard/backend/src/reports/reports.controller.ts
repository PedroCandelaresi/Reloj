import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { MonthlySummaryDto } from './dto/monthly-summary.dto';
import { DailyPresenceService } from './services/daily-presence.service';
import { IncompleteRecordsService } from './services/incomplete-records.service';
import { MonthlySummaryService } from './services/monthly-summary.service';
import { Phase2ReportsService } from './services/phase2-reports.service';
import { ReportsExcelExporter } from './exporters/reports-excel.exporter';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly dailyPresence: DailyPresenceService,
    private readonly incompleteRecords: IncompleteRecordsService,
    private readonly monthlySummary: MonthlySummaryService,
    private readonly phase2: Phase2ReportsService,
    private readonly excel: ReportsExcelExporter,
  ) {}

  @Get('daily-presence')
  async getDailyPresence(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const rows = await this.dailyPresence.getReport(filters, user);
    if (filters.format === 'excel') {
      this.sendExcel(res, await this.excel.dailyPresence(rows), 'presencia-diaria.xlsx');
      return;
    }

    res.json(rows);
  }

  @Get('incomplete-records')
  async getIncompleteRecords(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const rows = await this.incompleteRecords.getReport(filters, user);
    if (filters.format === 'excel') {
      this.sendExcel(res, await this.excel.incompleteRecords(rows), 'fichadas-incompletas.xlsx');
      return;
    }

    res.json(rows);
  }

  @Get('monthly-summary')
  async getMonthlySummary(
    @Query() filters: MonthlySummaryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const report = await this.monthlySummary.getReport(filters, user);
    if (filters.format === 'excel') {
      this.sendExcel(res, await this.excel.monthlySummary(report), 'resumen-mensual.xlsx');
      return;
    }

    res.json(report);
  }

  private sendExcel(res: Response, buffer: Buffer, filename: string): void {
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get('late-arrivals')
  async getLateArrivals(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const rows = await this.phase2.lateArrivals(filters, user);
    if (filters.format === 'excel') {
      this.sendExcel(res, await this.excel.phase2Rows('Tardanzas', rows), 'tardanzas.xlsx');
      return;
    }
    res.json(rows);
  }

  @Get('early-departures')
  async getEarlyDepartures(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const rows = await this.phase2.earlyDepartures(filters, user);
    if (filters.format === 'excel') {
      this.sendExcel(res, await this.excel.phase2Rows('Salidas tempranas', rows), 'salidas-tempranas.xlsx');
      return;
    }
    res.json(rows);
  }

  @Get('absences')
  async getAbsences(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const rows = await this.phase2.absences(filters, user);
    if (filters.format === 'excel') {
      this.sendExcel(res, await this.excel.phase2Rows('Ausencias', rows), 'ausencias.xlsx');
      return;
    }
    res.json(rows);
  }

  @Get('worked-hours')
  async getWorkedHours(
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const rows = await this.phase2.workedHours(filters, user);
    if (filters.format === 'excel') {
      this.sendExcel(res, await this.excel.phase2Rows('Horas trabajadas', rows), 'horas-trabajadas-resumen.xlsx');
      return;
    }
    res.json(rows);
  }
}
