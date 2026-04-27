import {
  Controller,
  Get,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AttendanceService } from './attendance.service';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { DevicesService } from '../devices/devices.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(
    private readonly attendance: AttendanceService,
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

  @Get('export')
  async export(
    @Query('format') format: 'excel' | 'pdf' = 'excel',
    @Query('userId') userId: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const opts = { userId, dateFrom, dateTo };

    if (format === 'pdf') {
      const buffer = await this.exports.exportPdf(opts, user);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="asistencia.pdf"',
        'Content-Length': buffer.length,
      });
      res.send(buffer);
    } else {
      const buffer = await this.exports.exportExcel(opts, user);
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="asistencia.xlsx"',
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
