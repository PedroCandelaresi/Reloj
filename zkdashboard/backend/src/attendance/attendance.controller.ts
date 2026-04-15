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

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(
    private readonly attendance: AttendanceService,
    private readonly exports: ExportService,
    private readonly devices: DevicesService,
  ) {}

  @Get('stats')
  getStats() {
    return this.attendance.getStats();
  }

  @Get('recent')
  getRecent() {
    return this.attendance.getRecent(20);
  }

  @Get('users')
  getUsers() {
    return this.attendance.getDistinctUsers();
  }

  @Get('devices')
  getDevices() {
    return this.devices.findAll();
  }

  @Get('export')
  async export(
    @Query('format') format: 'excel' | 'pdf' = 'excel',
    @Query('userId') userId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Res() res: Response,
  ) {
    const opts = { userId, dateFrom, dateTo };

    if (format === 'pdf') {
      const buffer = await this.exports.exportPdf(opts);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="asistencia.pdf"',
        'Content-Length': buffer.length,
      });
      res.send(buffer);
    } else {
      const buffer = await this.exports.exportExcel(opts);
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
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.attendance.findAll({ page, limit, userId, dateFrom, dateTo });
  }
}
