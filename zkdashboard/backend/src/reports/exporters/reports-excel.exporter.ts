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
import {
  CorrectedPunchReportRow,
  EmployeeWithoutPunchesReportRow,
  EmployeeWithoutScheduleReportRow,
  ManualPunchReportRow,
} from '../services/hr-control-reports.service';
import { MonthlyClosingReport } from '../services/monthly-closing.service';
import { getEmployeeDisplayName } from '../../employees/employee-name.util';

@Injectable()
export class ReportsExcelExporter {
  async dailyPresence(rows: DailyPresenceRow[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Presencia diaria');
    sheet.columns = [
      { header: 'Empleado', key: 'employee', width: 28 },
      { header: 'N° de usuario', key: 'userId', width: 18 },
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
      { header: 'N° de usuario', key: 'userId', width: 18 },
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
      { header: 'N° de usuario', key: 'userId', width: 18 },
      { header: 'Mes', key: 'period', width: 12 },
      { header: 'Fuente', key: 'source', width: 14 },
      { header: 'Días con fichadas', key: 'daysWithRecords', width: 18 },
      { header: 'Días presentes', key: 'presentDays', width: 16 },
      { header: 'Días ausentes', key: 'absentDays', width: 16 },
      { header: 'Días laborales', key: 'workDaysCount', width: 16 },
      { header: 'Ausencias justificadas', key: 'justifiedAbsentDaysCount', width: 22 },
      { header: 'Presentismo', key: 'attendancePercentage', width: 16 },
      { header: 'Feriados', key: 'holidayDays', width: 12 },
      { header: 'Fines de semana', key: 'weekendDays', width: 18 },
      { header: 'Total fichadas', key: 'totalPunches', width: 15 },
      { header: 'Minutos estimados', key: 'totalWorkedMinutes', width: 18 },
      { header: 'Horas estimadas', key: 'totalWorkedHours', width: 16 },
      { header: 'Minutos tardanza', key: 'totalLateMinutes', width: 18 },
      { header: 'Minutos salida temprana', key: 'totalEarlyDepartureMinutes', width: 24 },
      { header: 'Extra simple', key: 'totalOvertimeMinutes', width: 16 },
      { header: 'Días incompletos', key: 'incompleteDays', width: 18 },
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
        workDaysCount: row.workDaysCount ?? '',
        justifiedAbsentDaysCount: row.justifiedAbsentDaysCount ?? '',
        attendancePercentage:
          row.attendancePercentage === null || row.attendancePercentage === undefined
            ? ''
            : `${row.attendancePercentage}%`,
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
      { header: 'N° de usuario', key: 'userId', width: 18 },
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
      { header: 'Tipo de justificación', key: 'justificationTypeName', width: 28 },
      { header: 'Adjuntos', key: 'attachmentCount', width: 12 },
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
          justificationTypeName: day.justificationTypeName ?? '',
          attachmentCount: day.attachmentCount ?? 0,
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
      { header: 'N° de usuario', key: 'employeeId', width: 18 },
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
      { header: 'Justificación', key: 'justificationStatus', width: 22 },
      { header: 'Tipo de justificación', key: 'justificationTypeName', width: 28 },
      { header: 'Adjuntos', key: 'attachmentCount', width: 12 },
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
        justificationStatus: this.justificationLabel(row.justificationStatus),
        justificationTypeName: row.justificationTypeName ?? '',
        attachmentCount: row.attachmentCount,
        reason: row.reason ?? '',
      });
    });

    this.styleSheet(sheet);
    return this.writeBuffer(wb);
  }

  async manualPunches(rows: ManualPunchReportRow[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Fichadas manuales');
    sheet.columns = [
      { header: 'Empleado', key: 'employee', width: 28 },
      { header: 'Documento', key: 'employeeId', width: 18 },
      { header: 'Fecha y hora', key: 'punchTime', width: 22 },
      { header: 'Tipo', key: 'punchType', width: 14 },
      { header: 'Motivo', key: 'reason', width: 36 },
      { header: 'Tipo de justificación', key: 'justificationTypeName', width: 28 },
      { header: 'Adjuntos', key: 'attachmentCount', width: 12 },
      { header: 'Cargado por', key: 'createdBy', width: 24 },
      { header: 'Fecha de carga', key: 'createdAt', width: 22 },
      { header: 'Origen', key: 'source', width: 14 },
      { header: 'Estado solicitud', key: 'requestStatus', width: 20 },
    ];

    rows.forEach((row) => {
      sheet.addRow({
        employee: row.employee ? this.employeeName(row.employee) : row.employeeId,
        employeeId: row.employeeId,
        punchTime: formatArgentinaDateTime(row.punchTime),
        punchType: this.punchTypeLabel(row.punchType),
        reason: row.reason ?? '',
        justificationTypeName: row.justificationTypeName ?? '',
        attachmentCount: row.attachmentCount,
        createdBy: row.createdBy ?? '',
        createdAt: formatArgentinaDateTime(row.createdAt),
        source: 'Manual',
        requestStatus: this.requestStatusLabel(row.requestStatus),
      });
    });

    this.styleSheet(sheet);
    return this.writeBuffer(wb);
  }

  async correctedPunches(rows: CorrectedPunchReportRow[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Fichadas corregidas');
    sheet.columns = [
      { header: 'Empleado', key: 'employee', width: 28 },
      { header: 'Documento', key: 'employeeId', width: 18 },
      { header: 'Fecha original', key: 'originalDate', width: 16 },
      { header: 'Fecha corregida', key: 'correctedDate', width: 16 },
      { header: 'Valor anterior', key: 'oldValue', width: 28 },
      { header: 'Valor nuevo', key: 'newValue', width: 28 },
      { header: 'Motivo', key: 'reason', width: 36 },
      { header: 'Tipo de justificación', key: 'justificationTypeName', width: 28 },
      { header: 'Adjuntos', key: 'attachmentCount', width: 12 },
      { header: 'Corregido por', key: 'correctedBy', width: 24 },
      { header: 'Fecha de corrección', key: 'correctedAt', width: 22 },
      { header: 'Estado solicitud', key: 'requestStatus', width: 20 },
    ];

    rows.forEach((row) => {
      sheet.addRow({
        employee: row.employee ? this.employeeName(row.employee) : row.employeeId ?? '',
        employeeId: row.employeeId ?? '',
        originalDate: row.originalDate ?? '',
        correctedDate: row.correctedDate ?? '',
        oldValue: row.oldValue ?? '',
        newValue: row.newValue ?? '',
        reason: row.reason ?? '',
        justificationTypeName: row.justificationTypeName ?? '',
        attachmentCount: row.attachmentCount,
        correctedBy: row.correctedBy ?? '',
        correctedAt: formatArgentinaDateTime(row.correctedAt),
        requestStatus: this.requestStatusLabel(row.requestStatus),
      });
    });

    this.styleSheet(sheet);
    return this.writeBuffer(wb);
  }

  async employeesWithoutSchedule(rows: EmployeeWithoutScheduleReportRow[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Empleados sin horario');
    sheet.columns = [
      { header: 'Empleado', key: 'employee', width: 28 },
      { header: 'Documento', key: 'document', width: 18 },
      { header: 'Estado', key: 'status', width: 14 },
      { header: 'Motivo', key: 'reason', width: 38 },
    ];

    rows.forEach((row) => {
      sheet.addRow({
        employee: row.employee ? this.employeeName(row.employee) : row.employeeId,
        document: row.document,
        status: row.status,
        reason: row.reason,
      });
    });

    this.styleSheet(sheet);
    return this.writeBuffer(wb);
  }

  async employeesWithoutPunches(rows: EmployeeWithoutPunchesReportRow[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Empleados sin fichadas');
    sheet.columns = [
      { header: 'Empleado', key: 'employee', width: 28 },
      { header: 'Documento', key: 'document', width: 18 },
      { header: 'Desde', key: 'dateFrom', width: 14 },
      { header: 'Hasta', key: 'dateTo', width: 14 },
      { header: 'Cantidad de fichadas', key: 'punchCount', width: 20 },
    ];

    rows.forEach((row) => {
      sheet.addRow({
        employee: row.employee ? this.employeeName(row.employee) : row.employeeId,
        document: row.document,
        dateFrom: row.dateFrom,
        dateTo: row.dateTo,
        punchCount: row.punchCount,
      });
    });

    this.styleSheet(sheet);
    return this.writeBuffer(wb);
  }

  async monthlyClosing(report: MonthlyClosingReport): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const summary = wb.addWorksheet('Resumen');
    summary.columns = [
      { header: 'Empleado', key: 'employee', width: 28 },
      { header: 'Documento / N° de usuario', key: 'document', width: 24 },
      { header: 'Días laborales', key: 'workDaysCount', width: 16 },
      { header: 'Días trabajados', key: 'workedDaysCount', width: 16 },
      { header: 'Ausencias justificadas', key: 'justifiedAbsentDaysCount', width: 24 },
      { header: 'Ausencias sin justificar', key: 'unjustifiedAbsentDaysCount', width: 24 },
      { header: 'Tardanzas justificadas', key: 'justifiedLateDaysCount', width: 24 },
      { header: 'Tardanzas sin justificar', key: 'unjustifiedLateDaysCount', width: 24 },
      { header: 'Justificaciones pendientes', key: 'pendingJustificationsCount', width: 26 },
      { header: 'Salidas tempranas', key: 'earlyDepartureDaysCount', width: 20 },
      { header: 'Horas trabajadas', key: 'workedHours', width: 18 },
      { header: 'Horas esperadas', key: 'expectedHours', width: 18 },
      { header: 'Horas extra simples', key: 'overtimeHours', width: 20 },
      { header: 'Presentismo %', key: 'attendancePercentage', width: 16 },
      { header: 'Fichadas manuales', key: 'manualPunchesCount', width: 20 },
      { header: 'Fichadas corregidas', key: 'correctedPunchesCount', width: 22 },
      { header: 'Estado', key: 'status', width: 18 },
      { header: 'Observaciones', key: 'observations', width: 60 },
    ];

    report.rows.forEach((row) => {
      summary.addRow({
        employee: row.employeeName,
        document: row.document,
        workDaysCount: row.workDaysCount,
        workedDaysCount: row.workedDaysCount,
        justifiedAbsentDaysCount: row.justifiedAbsentDaysCount,
        unjustifiedAbsentDaysCount: row.unjustifiedAbsentDaysCount,
        justifiedLateDaysCount: row.justifiedLateDaysCount,
        unjustifiedLateDaysCount: row.unjustifiedLateDaysCount,
        pendingJustificationsCount: row.pendingJustificationsCount,
        earlyDepartureDaysCount: row.earlyDepartureDaysCount,
        workedHours: this.minutesToHours(row.workedMinutes),
        expectedHours: this.minutesToHours(row.expectedMinutes),
        overtimeHours: this.minutesToHours(row.overtimeMinutes),
        attendancePercentage: row.attendancePercentage === null ? 'Sin días laborales' : `${row.attendancePercentage}%`,
        manualPunchesCount: row.manualPunchesCount,
        correctedPunchesCount: row.correctedPunchesCount,
        status: this.monthlyClosingStatusLabel(row.status),
        observations: row.observations.join(' · '),
      });
    });
    this.styleSheet(summary);

    const detail = wb.addWorksheet('Detalle diario');
    detail.columns = [
      { header: 'Empleado', key: 'employee', width: 28 },
      { header: 'Documento / N° de usuario', key: 'document', width: 24 },
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Estado del día', key: 'dayStatus', width: 22 },
      { header: 'Primera fichada', key: 'firstPunch', width: 22 },
      { header: 'Última fichada', key: 'lastPunch', width: 22 },
      { header: 'Horas trabajadas', key: 'workedHours', width: 18 },
      { header: 'Horas esperadas', key: 'expectedHours', width: 18 },
      { header: 'Tardanza', key: 'lateMinutes', width: 12 },
      { header: 'Salida temprana', key: 'earlyDepartureMinutes', width: 18 },
      { header: 'Hora extra simple', key: 'overtimeMinutes', width: 18 },
      { header: 'Justificación', key: 'justificationStatus', width: 22 },
      { header: 'Tipo de justificación', key: 'justificationTypeName', width: 28 },
      { header: 'Adjuntos', key: 'attachmentCount', width: 12 },
      { header: 'Observación', key: 'observation', width: 44 },
    ];

    report.rows.forEach((row) => {
      row.days.forEach((day) => {
        detail.addRow({
          employee: day.employeeName,
          document: day.document,
          date: day.date,
          dayStatus: day.dayStatus,
          firstPunch: formatArgentinaDateTime(day.firstPunch),
          lastPunch: formatArgentinaDateTime(day.lastPunch),
          workedHours: this.minutesToHours(day.workedMinutes),
          expectedHours: this.minutesToHours(day.expectedMinutes),
          lateMinutes: day.lateMinutes,
          earlyDepartureMinutes: day.earlyDepartureMinutes,
          overtimeMinutes: day.overtimeMinutes,
          justificationStatus: this.justificationLabel(day.justificationStatus),
          justificationTypeName: day.justificationTypeName ?? '',
          attachmentCount: day.attachmentCount,
          observation: day.observation,
        });
      });
    });
    this.styleSheet(detail);

    return this.writeBuffer(wb);
  }

  private employeeName(employee: { nombre: string; apellido: string }): string {
    return getEmployeeDisplayName(employee) || 'Sin nombre';
  }

  private requestStatusLabel(status: string | null): string {
    switch (status) {
      case 'approved':
        return 'Aprobada';
      case 'pending':
        return 'Pendiente';
      case 'rejected':
        return 'Rechazada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return '';
    }
  }

  private punchTypeLabel(type: string | null): string {
    switch (type) {
      case 'in':
        return 'Entrada';
      case 'out':
        return 'Salida';
      case 'unknown':
        return 'Sin identificar';
      default:
        return type ?? '';
    }
  }

  private justificationLabel(status: string | null | undefined): string {
    switch (status) {
      case 'approved':
        return 'Justificado';
      case 'pending':
        return 'Pendiente de revisión';
      case 'rejected':
      case 'none':
      default:
        return 'Sin justificar';
    }
  }

  private monthlyClosingStatusLabel(status: string): string {
    switch (status) {
      case 'ok':
        return 'OK';
      case 'review_required':
        return 'Revisar';
      case 'incomplete_data':
        return 'Datos incompletos';
      default:
        return status;
    }
  }

  private minutesToHours(minutes: number): number {
    return Math.round((minutes / 60) * 100) / 100;
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
