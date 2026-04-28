import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  DailyPresenceRow,
  IncompleteRecordRow,
  MonthlySummaryReport,
  MonthlySummaryRow,
} from '../types/report.types';
import { formatArgentinaDateTime, formatArgentinaTime } from '../utils/argentina-date.util';
import { Phase2ReportRow } from '../services/phase2-reports.service';

@Injectable()
export class ReportsExcelExporter {
  async dailyPresence(rows: DailyPresenceRow[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Presencia diaria');
    sheet.columns = [
      { header: 'Empleado', key: 'employee', width: 28 },
      { header: 'PIN', key: 'userId', width: 18 },
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Primera fichada', key: 'firstPunch', width: 22 },
      { header: 'Ultima fichada', key: 'lastPunch', width: 22 },
      { header: 'Fichadas', key: 'punchCount', width: 10 },
      { header: 'Minutos estimados', key: 'workedMinutes', width: 18 },
      { header: 'Dispositivo principal', key: 'primaryDevice', width: 24 },
      { header: 'Estado', key: 'status', width: 14 },
    ];

    rows.forEach((row) => {
      sheet.addRow({
        employee: this.employeeName(row.employee),
        userId: row.userId,
        date: row.date,
        firstPunch: formatArgentinaDateTime(row.firstPunch),
        lastPunch: formatArgentinaDateTime(row.lastPunch),
        punchCount: row.punchCount,
        workedMinutes: row.workedMinutes,
        primaryDevice: row.primaryDevice ?? '',
        status: row.status,
      });
    });

    this.styleSheet(sheet);
    return this.writeBuffer(wb);
  }

  async incompleteRecords(rows: IncompleteRecordRow[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Fichadas incompletas');
    sheet.columns = [
      { header: 'Empleado', key: 'employee', width: 28 },
      { header: 'PIN', key: 'userId', width: 18 },
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Fichadas', key: 'punchCount', width: 10 },
      { header: 'Horarios', key: 'punchTimes', width: 44 },
      { header: 'Dispositivos', key: 'devices', width: 32 },
      { header: 'Motivo', key: 'reason', width: 22 },
    ];

    rows.forEach((row) => {
      sheet.addRow({
        employee: this.employeeName(row.employee),
        userId: row.userId,
        date: row.date,
        punchCount: row.punchCount,
        punchTimes: row.punchTimes.map((date) => formatArgentinaTime(date)).join(', '),
        devices: row.devices.join(', '),
        reason: row.reason,
      });
    });

    this.styleSheet(sheet);
    return this.writeBuffer(wb);
  }

  async monthlySummary(reportOrRows: MonthlySummaryReport | MonthlySummaryRow[]): Promise<Buffer> {
    const rows = Array.isArray(reportOrRows) ? reportOrRows : reportOrRows.rows;
    const source = Array.isArray(reportOrRows) ? 'raw_records' : reportOrRows.source;
    const wb = new ExcelJS.Workbook();
    const summary = wb.addWorksheet('Resumen mensual');
    summary.columns = [
      { header: 'Empleado', key: 'employee', width: 28 },
      { header: 'PIN', key: 'userId', width: 18 },
      { header: 'Mes', key: 'period', width: 12 },
      { header: 'Fuente', key: 'source', width: 14 },
      { header: 'Dias con fichadas', key: 'daysWithRecords', width: 18 },
      { header: 'Dias presentes', key: 'presentDays', width: 16 },
      { header: 'Dias ausentes', key: 'absentDays', width: 16 },
      { header: 'Feriados', key: 'holidayDays', width: 12 },
      { header: 'Fines de semana', key: 'weekendDays', width: 18 },
      { header: 'Total fichadas', key: 'totalPunches', width: 15 },
      { header: 'Minutos estimados', key: 'totalWorkedMinutes', width: 18 },
      { header: 'Horas estimadas', key: 'totalWorkedHours', width: 16 },
      { header: 'Minutos tardanza', key: 'totalLateMinutes', width: 18 },
      { header: 'Minutos salida temprana', key: 'totalEarlyDepartureMinutes', width: 24 },
      { header: 'Extra simple', key: 'totalOvertimeMinutes', width: 16 },
      { header: 'Dias incompletos', key: 'incompleteDays', width: 18 },
    ];

    rows.forEach((row) => {
      summary.addRow({
        employee: this.employeeName(row.employee),
        userId: row.userId,
        period: `${String(row.month).padStart(2, '0')}/${row.year}`,
        source,
        daysWithRecords: row.daysWithRecords,
        presentDays: row.presentDays,
        absentDays: row.absentDays,
        holidayDays: row.holidayDays,
        weekendDays: row.weekendDays,
        totalPunches: row.totalPunches,
        totalWorkedMinutes: row.totalWorkedMinutes,
        totalWorkedHours: row.totalWorkedHours,
        totalLateMinutes: row.totalLateMinutes,
        totalEarlyDepartureMinutes: row.totalEarlyDepartureMinutes,
        totalOvertimeMinutes: row.totalOvertimeMinutes,
        incompleteDays: row.incompleteDays,
      });
    });
    this.styleSheet(summary);

    const detail = wb.addWorksheet('Detalle diario');
    detail.columns = [
      { header: 'Empleado', key: 'employee', width: 28 },
      { header: 'PIN', key: 'userId', width: 18 },
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Primera fichada', key: 'firstPunch', width: 22 },
      { header: 'Ultima fichada', key: 'lastPunch', width: 22 },
      { header: 'Fichadas', key: 'punchCount', width: 10 },
      { header: 'Minutos estimados', key: 'workedMinutes', width: 18 },
      { header: 'Minutos esperados', key: 'expectedMinutes', width: 18 },
      { header: 'Tardanza', key: 'lateMinutes', width: 12 },
      { header: 'Salida temprana', key: 'earlyDepartureMinutes', width: 18 },
      { header: 'Extra simple', key: 'overtimeMinutes', width: 14 },
      { header: 'Ausente', key: 'isAbsent', width: 10 },
      { header: 'Feriado', key: 'isHoliday', width: 10 },
      { header: 'Fin de semana', key: 'isWeekend', width: 14 },
      { header: 'Incompleto', key: 'hasIncompleteRecord', width: 12 },
      { header: 'Estado', key: 'status', width: 14 },
    ];

    rows.forEach((row) => {
      row.days.forEach((day) => {
        detail.addRow({
          employee: this.employeeName(row.employee),
          userId: row.userId,
          date: day.date,
          firstPunch: formatArgentinaDateTime(day.firstPunch),
          lastPunch: formatArgentinaDateTime(day.lastPunch),
          punchCount: day.punchCount,
          workedMinutes: day.workedMinutes,
          expectedMinutes: day.expectedMinutes,
          lateMinutes: day.lateMinutes,
          earlyDepartureMinutes: day.earlyDepartureMinutes,
          overtimeMinutes: day.overtimeMinutes,
          isAbsent: day.isAbsent ? 'Si' : 'No',
          isHoliday: day.isHoliday ? 'Si' : 'No',
          isWeekend: day.isWeekend ? 'Si' : 'No',
          hasIncompleteRecord: day.hasIncompleteRecord ? 'Si' : 'No',
          status: day.status,
        });
      });
    });
    this.styleSheet(detail);

    return this.writeBuffer(wb);
  }

  async phase2Rows(sheetName: string, rows: Phase2ReportRow[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet(sheetName);
    sheet.columns = [
      { header: 'Empleado', key: 'employee', width: 28 },
      { header: 'PIN', key: 'employeeId', width: 18 },
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Entrada esperada', key: 'expectedEntryTime', width: 18 },
      { header: 'Salida esperada', key: 'expectedExitTime', width: 18 },
      { header: 'Primera fichada', key: 'firstPunchAt', width: 22 },
      { header: 'Ultima fichada', key: 'lastPunchAt', width: 22 },
      { header: 'Tardanza', key: 'lateMinutes', width: 12 },
      { header: 'Salida temprana', key: 'earlyDepartureMinutes', width: 18 },
      { header: 'Trabajados', key: 'workedMinutes', width: 14 },
      { header: 'Esperados', key: 'expectedMinutes', width: 14 },
      { header: 'Extra simple', key: 'overtimeMinutes', width: 14 },
      { header: 'Estado', key: 'status', width: 16 },
      { header: 'Motivo', key: 'reason', width: 22 },
    ];

    rows.forEach((row) => {
      sheet.addRow({
        employee: row.employee ? this.employeeName(row.employee) : row.employeeId,
        employeeId: row.employeeId,
        date: row.date,
        expectedEntryTime: row.expectedEntryTime ?? '',
        expectedExitTime: row.expectedExitTime ?? '',
        firstPunchAt: formatArgentinaDateTime(row.firstPunchAt),
        lastPunchAt: formatArgentinaDateTime(row.lastPunchAt),
        lateMinutes: row.lateMinutes,
        earlyDepartureMinutes: row.earlyDepartureMinutes,
        workedMinutes: row.workedMinutes,
        expectedMinutes: row.expectedMinutes,
        overtimeMinutes: row.overtimeMinutes,
        status: row.status,
        reason: row.reason ?? '',
      });
    });

    this.styleSheet(sheet);
    return this.writeBuffer(wb);
  }

  private employeeName(employee: { nombre: string; apellido: string }): string {
    return [employee.apellido, employee.nombre].filter(Boolean).join(', ') || 'Sin nombre';
  }

  private styleSheet(sheet: ExcelJS.Worksheet): void {
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  private async writeBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
