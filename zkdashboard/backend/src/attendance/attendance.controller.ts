import {
  Controller,
  Body,
  Get,
  Post,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AttendanceService } from './attendance.service';
import { AttendanceCalculationService } from './attendance-calculation.service';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { DevicesService } from '../devices/devices.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { RecalculateAttendanceDto } from './dto/recalculate-attendance.dto';
import { DaySummariesQueryDto } from './dto/day-summaries-query.dto';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(
    private readonly attendance: AttendanceService,
    private readonly calculations: AttendanceCalculationService,
    private readonly exports: ExportService,
    private readonly devices: DevicesService,
  ) {}

  @Get('stats')
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.attendance.getStats(user);
  }

  @Get('dashboard')
  getDashboardSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.attendance.getDashboardSummary(user);
  }

  @Get('recent')
  getRecent(@CurrentUser() user: AuthenticatedUser) {
    return this.attendance.getRecent(user, 20);
  }

  @Get('users')
  getUsers(@CurrentUser() user: AuthenticatedUser) {
    return this.attendance.getDistinctUsers(user);
  }

  @Get('devices')
  getDevices(@CurrentUser() user: AuthenticatedUser) {
    return this.devices.findAllForUser(user);
  }

  @Post('recalculate')
  recalculate(
    @Body() dto: RecalculateAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = this.calculations.resolveWritableCompanyId(user, dto.companyId);
    return this.calculations.recalculateCompanyRange(
      companyId,
      dto.dateFrom,
      dto.dateTo,
      dto.employeeId,
    );
  }

  @Get('day-summaries')
  getDaySummaries(
    @Query() query: DaySummariesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.calculations.getDaySummaries({
      user,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      employeeId: query.employeeId,
      companyId: query.companyId,
    });
  }

  @Get('export')
  async export(
    @Query('format') format: 'excel' | 'pdf' = 'excel',
    @Query('report') report: 'records' | 'hours' = 'records',
    @Query('userId') userId: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const opts = { userId, dateFrom, dateTo };
    const filename = report === 'hours' ? 'horas-trabajadas' : 'asistencia';

    if (format === 'pdf') {
      const buffer =
        report === 'hours'
          ? await this.exports.exportHoursPdf(opts, user)
          : await this.exports.exportPdf(opts, user);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        'Content-Length': buffer.length,
      });
      res.send(buffer);
    } else {
      const buffer =
        report === 'hours'
          ? await this.exports.exportHoursExcel(opts, user)
          : await this.exports.exportExcel(opts, user);
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        'Content-Length': buffer.length,
      });
      res.send(buffer);
    }
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('userId') userId: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendance.findAll({ user, page, limit, userId, dateFrom, dateTo });
  }
}
