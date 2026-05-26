import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import PDFDocument = require('pdfkit');
import { AttendanceRecord } from './attendance.entity';
import { Employee } from '../employees/employee.entity';
import { Company } from '../companies/company.entity';
import { ScheduleProfile } from '../companies/schedule-profile.entity';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { getCompanyScope } from '../auth/company-scope.util';
import { parseArgentinaDateEnd, parseArgentinaDateStart } from '../reports/utils/argentina-date.util';

const STATUS_LABELS: Record<number, string> = {
  0: 'Entrada',
  1: 'Salida',
  2: 'Descanso Sal.',
  3: 'Descanso Ent.',
  4: 'Entrada extra informada',
  5: 'Salida extra informada',
};

const VERIFY_LABELS: Record<number, string> = {
  0: 'Contraseña',
  1: 'Huella',
  2: 'Tarjeta badge',
  4: 'Tarjeta RFID',
  5: 'Huella o contraseña',
  6: 'Huella o tarjeta',
  8: 'Tarjeta y huella',
  9: 'Huella y contraseña',
  15: 'Rostro',
  16: 'Rostro y huella',
  17: 'Rostro y contraseña',
  21: 'Vena de dedo',
  25: 'Palmilla',
  101: 'GPS',
  102: 'AI Camera',
  200: 'Otro',
};

const TZ = 'America/Argentina/Buenos_Aires';

function fmtDate(date: Date | string): string {
  return new Date(date).toLocaleString('es-AR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function fmtDateOnly(date: string): string {
  const [year, month, day] = date.split('-');
  if (year && month && day) return `${day}/${month}/${year}`;
  return date;
}

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly repo: Repository<AttendanceRecord>,
    @InjectRepository(Company)
    private readonly companiesRepo: Repository<Company>,
    @InjectRepository(ScheduleProfile)
    private readonly scheduleProfilesRepo: Repository<ScheduleProfile>,
  ) {}

  private async getFiltered(opts: {
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }, user: AuthenticatedUser): Promise<AttendanceRecord[]> {
    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndMapOne('r.employee', Employee, 'e', 'e.id = r.user_id');

    const companyId = getCompanyScope(user);
    if (companyId) {
      qb.andWhere('r.company_id = :companyId', { companyId });
    }

    if (opts.userId) qb.andWhere('r.user_id = :userId', { userId: opts.userId });
    if (opts.dateFrom) qb.andWhere('r.timestamp >= :df', { df: parseArgentinaDateStart(opts.dateFrom) });
    if (opts.dateTo) qb.andWhere('r.timestamp <= :dt', { dt: parseArgentinaDateEnd(opts.dateTo) });
    return qb.orderBy('r.timestamp', 'ASC').getMany();
  }

  private assertRecordsForExport(rows: unknown[]): void {
    if (rows.length === 0) {
      throw new BadRequestException('No existen datos suficientes para exportar.');
    }
  }

  private buildExportSummary(
    opts: {
      userId?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    generatedAt: Date,
    totalRecords: number,
  ): string {
    const filters: string[] = [];

    if (opts.userId) filters.push(`DNI: ${opts.userId}`);
    if (opts.dateFrom) filters.push(`Desde: ${fmtDateOnly(opts.dateFrom)}`);
    if (opts.dateTo) filters.push(`Hasta: ${fmtDateOnly(opts.dateTo)}`);

    const filtersLabel = filters.length > 0 ? `  ·  Filtros: ${filters.join(' | ')}` : '';
    return `Generado el ${fmtDate(generatedAt)}  ·  ${totalRecords} registros${filtersLabel}`;
  }

  private getDateKey(date: Date | string): string {
    const value = new Date(date);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private fmtHours(hours: number | null): string {
    if (hours === null) return '—';
    return hours.toFixed(2);
  }

  private fmtTime(date: Date | string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleTimeString('es-AR', {
      timeZone: TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private getMonthDay(date: Date | string): string {
    const value = new Date(date);
    return `${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  private isMonthDayInRange(monthDay: string, start: string | null, end: string | null): boolean {
    if (!start || !end) return false;
    return start <= end
      ? monthDay >= start && monthDay <= end
      : monthDay >= start || monthDay <= end;
  }

  private getProfileTimesForDate(profile: ScheduleProfile, date: string) {
    const monthDay = this.getMonthDay(date);

    if (
      this.isMonthDayInRange(monthDay, profile.summerStart, profile.summerEnd) &&
      profile.summerEntryTime &&
      profile.summerExitTime
    ) {
      return {
        entryTime: profile.summerEntryTime,
        exitTime: profile.summerExitTime,
      };
    }

    if (
      this.isMonthDayInRange(monthDay, profile.winterStart, profile.winterEnd) &&
      profile.winterEntryTime &&
      profile.winterExitTime
    ) {
      return {
        entryTime: profile.winterEntryTime,
        exitTime: profile.winterExitTime,
      };
    }

    return {
      entryTime: profile.entryTime,
      exitTime: profile.exitTime,
    };
  }

  private async getCompanyDefaultsById(
    user: AuthenticatedUser,
    records: AttendanceRecord[],
  ): Promise<Map<string, { entryTime: string | null; exitTime: string | null }>> {
    const defaults = new Map<string, { entryTime: string | null; exitTime: string | null }>();
    const companyId = getCompanyScope(user);
    if (!companyId) {
      const companyIds = [
        ...new Set(
          records
            .map((record) => record.companyId)
            .filter((value): value is string => typeof value === 'string' && value.trim() !== ''),
        ),
      ];

      if (companyIds.length === 0) {
        return defaults;
      }

      const companies = await this.companiesRepo.findBy({ id: In(companyIds) });
      for (const company of companies) {
        defaults.set(company.id, {
          entryTime: company.defaultEntryTime,
          exitTime: company.defaultExitTime,
        });
      }
      return defaults;
    }

    const company = await this.companiesRepo.findOneBy({ id: companyId });
    defaults.set(companyId, {
      entryTime: company?.defaultEntryTime ?? null,
      exitTime: company?.defaultExitTime ?? null,
    });
    return defaults;
  }

  private async buildHoursRows(
    opts: {
      userId?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    user: AuthenticatedUser,
  ) {
    const records = await this.getFiltered(opts, user);
    const companyDefaultsById = await this.getCompanyDefaultsById(user, records);
    const profileIds = [
      ...new Set(
        records
          .map((record) => record.employee?.scheduleProfileId)
          .filter((value): value is string => typeof value === 'string' && value.trim() !== ''),
      ),
    ];
    const profiles = profileIds.length > 0
      ? await this.scheduleProfilesRepo.findBy({ id: In(profileIds) })
      : [];
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
    const grouped = new Map<string, AttendanceRecord[]>();

    for (const record of records) {
      const key = `${record.userId}|${this.getDateKey(record.timestamp)}`;
      grouped.set(key, [...(grouped.get(key) ?? []), record]);
    }

    return [...grouped.entries()]
      .map(([key, dayRecords]) => {
        const [userId, date] = key.split('|');
        const sorted = dayRecords.sort(
          (left, right) =>
            new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
        );
        const employee = sorted[0]?.employee ?? null;
        const entryRecord = sorted.find((record) => record.status === 0) ?? sorted[0] ?? null;
        const exitRecord =
          [...sorted].reverse().find((record) => record.status === 1) ??
          (sorted.length > 1 ? sorted[sorted.length - 1] : null);
        const workedMs =
          entryRecord && exitRecord
            ? new Date(exitRecord.timestamp).getTime() -
              new Date(entryRecord.timestamp).getTime()
            : null;
        const workedHours =
          workedMs !== null && workedMs >= 0 ? workedMs / 1000 / 60 / 60 : null;
        const companyDefaults = sorted[0]?.companyId
          ? companyDefaultsById.get(sorted[0].companyId)
          : null;
        const profileTimes = employee?.scheduleProfileId
          ? profilesById.get(employee.scheduleProfileId)
          : null;
        const effectiveProfileTimes = profileTimes
          ? this.getProfileTimesForDate(profileTimes, date)
          : null;
        const expectedEntry =
          employee?.entryTime ?? effectiveProfileTimes?.entryTime ?? companyDefaults?.entryTime;
        const expectedExit =
          employee?.exitTime ?? effectiveProfileTimes?.exitTime ?? companyDefaults?.exitTime;

        return {
          userId,
          apellido: employee?.apellido ?? '—',
          nombre: employee?.nombre ?? '—',
          date,
          expectedEntry: expectedEntry ?? '—',
          expectedExit: expectedExit ?? '—',
          firstEntry: this.fmtTime(entryRecord?.timestamp ?? null),
          lastExit: this.fmtTime(exitRecord?.timestamp ?? null),
          workedHours,
          recordsCount: sorted.length,
        };
      })
      .sort((left, right) =>
        `${left.date}|${left.apellido}|${left.nombre}|${left.userId}`.localeCompare(
          `${right.date}|${right.apellido}|${right.nombre}|${right.userId}`,
        ),
      );
  }

  // ─── Excel ────────────────────────────────────────────────────────────────

  async exportExcel(opts: {
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }, user: AuthenticatedUser): Promise<Buffer> {
    const records = await this.getFiltered(opts, user);
    this.assertRecordsForExport(records);
    const generatedAt = new Date();

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ZK Dashboard';
    wb.created = generatedAt;

    const ws = wb.addWorksheet('Asistencia', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
    });

    ws.columns = [
      { key: 'userId',    width: 14 },
      { key: 'apellido',  width: 20 },
      { key: 'nombre',    width: 20 },
      { key: 'timestamp', width: 24 },
      { key: 'status',    width: 28 },
      { key: 'verify',    width: 14 },
      { key: 'workCode',  width: 14 },
      { key: 'device',    width: 14 },
    ];

    ws.mergeCells('A1:H1');
    ws.getCell('A1').value = 'Registros de Asistencia';
    ws.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF111827' } };
    ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('A2:H2');
    ws.getCell('A2').value = this.buildExportSummary(opts, generatedAt, records.length);
    ws.getCell('A2').font = { size: 10, color: { argb: 'FF4B5563' } };
    ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.addRow([]);

    const headerRow = ws.addRow({
      userId: 'ID Empleado',
      apellido: 'Apellido',
      nombre: 'Nombre',
      timestamp: 'Fecha y Hora',
      status: 'Estado informado por reloj',
      verify: 'Verificación',
      workCode: 'Cód. Trabajo',
      device: 'Dispositivo',
    });

    // Header styling
    ws.getRow(1).height = 24;
    ws.getRow(2).height = 20;
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      cell.font   = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Data rows
    records.forEach((r, idx) => {
      const row = ws.addRow({
        userId:    r.userId,
        apellido:  r.employee?.apellido ?? '—',
        nombre:    r.employee?.nombre   ?? '—',
        timestamp: fmtDate(r.timestamp),
        status:    r.devicePunchStateLabel ?? STATUS_LABELS[r.status] ?? String(r.status),
        verify:    VERIFY_LABELS[r.verifyType] ?? String(r.verifyType),
        workCode:  r.workCode ?? '—',
        device:    r.deviceSn,
      });

      row.height = 20;
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
      row.eachCell((cell) => {
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = { vertical: 'middle' };
        cell.font      = { size: 10 };
      });

      // Colorear estado
      const statusCell = row.getCell('status');
      if (r.status === 0) statusCell.font = { color: { argb: 'FF15803D' }, bold: true, size: 10 };
      else if (r.status === 1) statusCell.font = { color: { argb: 'FFB91C1C' }, bold: true, size: 10 };
    });

    ws.views = [{ state: 'frozen', ySplit: headerRow.number }];
    ws.autoFilter = {
      from: { row: headerRow.number, column: 1 },
      to: { row: headerRow.number, column: 8 },
    };

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // ─── PDF ──────────────────────────────────────────────────────────────────

  async exportPdf(opts: {
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }, user: AuthenticatedUser): Promise<Buffer> {
    const records = await this.getFiltered(opts, user);
    this.assertRecordsForExport(records);
    const generatedAt = new Date();

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size:   'A4',
        layout: 'landscape',
        margin: 40,
        info:   { Title: 'Registros de Asistencia', Author: 'ZK Dashboard', CreationDate: generatedAt },
      });

      const chunks: Buffer[] = [];
      doc.on('data',  (c) => chunks.push(Buffer.from(c)));
      doc.on('end',   () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Encabezado
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('#111827')
        .text('Registros de Asistencia', { align: 'center' });

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#6B7280')
        .text(this.buildExportSummary(opts, generatedAt, records.length), { align: 'center' });

      doc.moveDown(1.2);

      // Tabla
      const headers = ['ID Empleado', 'Apellido', 'Nombre', 'Fecha y Hora', 'Estado reloj', 'Verificación', 'Dispositivo'];
      const widths  = [70,             115,        105,       135,            85,       90,             115];

      this.drawPdfTable(doc, records, headers, widths, 40);

      doc.end();
    });
  }

  async exportHoursExcel(opts: {
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }, user: AuthenticatedUser): Promise<Buffer> {
    const rows = await this.buildHoursRows(opts, user);
    this.assertRecordsForExport(rows);
    const generatedAt = new Date();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Horas trabajadas', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
    });

    ws.columns = [
      { key: 'userId', width: 14 },
      { key: 'apellido', width: 20 },
      { key: 'nombre', width: 20 },
      { key: 'date', width: 14 },
      { key: 'expectedEntry', width: 14 },
      { key: 'expectedExit', width: 14 },
      { key: 'firstEntry', width: 14 },
      { key: 'lastExit', width: 14 },
      { key: 'workedHours', width: 14 },
      { key: 'recordsCount', width: 12 },
    ];

    ws.mergeCells('A1:J1');
    ws.getCell('A1').value = 'Reporte de horas trabajadas';
    ws.getCell('A1').font = { bold: true, size: 16 };
    ws.getCell('A1').alignment = { horizontal: 'center' };
    ws.mergeCells('A2:J2');
    ws.getCell('A2').value = this.buildExportSummary(opts, generatedAt, rows.length);
    ws.getCell('A2').alignment = { horizontal: 'center' };

    ws.addRow([]);
    const headerRow = ws.addRow({
      userId: 'ID Empleado',
      apellido: 'Apellido',
      nombre: 'Nombre',
      date: 'Fecha',
      expectedEntry: 'Entrada esperada',
      expectedExit: 'Salida esperada',
      firstEntry: 'Primera entrada',
      lastExit: 'Última salida',
      workedHours: 'Horas',
      recordsCount: 'Fichadas',
    });

    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    rows.forEach((item, idx) => {
      const row = ws.addRow({
        ...item,
        workedHours: this.fmtHours(item.workedHours),
      });
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = { vertical: 'middle' };
        cell.font = { size: 10 };
      });
    });

    ws.views = [{ state: 'frozen', ySplit: headerRow.number }];
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async exportHoursPdf(opts: {
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }, user: AuthenticatedUser): Promise<Buffer> {
    const rows = await this.buildHoursRows(opts, user);
    this.assertRecordsForExport(rows);
    const generatedAt = new Date();

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 36,
        info: { Title: 'Reporte de horas trabajadas', Author: 'ZK Dashboard', CreationDate: generatedAt },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.font('Helvetica-Bold').fontSize(18).fillColor('#111827')
        .text('Reporte de horas trabajadas', { align: 'center' });
      doc.font('Helvetica').fontSize(9).fillColor('#6B7280')
        .text(this.buildExportSummary(opts, generatedAt, rows.length), { align: 'center' });
      doc.moveDown(1);

      const headers = ['ID', 'Apellido', 'Nombre', 'Fecha', 'Esp. Ent.', 'Esp. Sal.', 'Entrada', 'Salida', 'Horas'];
      const widths = [55, 95, 90, 70, 60, 60, 60, 60, 55];
      const records = rows.map((row) => [
        row.userId,
        row.apellido,
        row.nombre,
        row.date,
        row.expectedEntry,
        row.expectedExit,
        row.firstEntry,
        row.lastExit,
        this.fmtHours(row.workedHours),
      ]);

      this.drawSimplePdfTable(doc, records, headers, widths, 36);
      doc.end();
    });
  }

  private drawSimplePdfTable(
    doc: PDFKit.PDFDocument,
    rows: string[][],
    headers: string[],
    widths: number[],
    startX: number,
  ) {
    const rowHeight = 18;
    const pageBottom = doc.page.height - (doc.page.margins as any).bottom;
    let y = doc.y;

    const drawRow = (cells: string[], isHeader: boolean, isEven: boolean) => {
      if (y + rowHeight > pageBottom) {
        doc.addPage();
        y = (doc.page.margins as any).top;
        drawRow(headers, true, false);
        return;
      }

      let x = startX;
      cells.forEach((text, index) => {
        const bg = isHeader ? '#1F2937' : isEven ? '#F9FAFB' : '#FFFFFF';
        doc.rect(x, y, widths[index], rowHeight).fill(bg).stroke('#E5E7EB');
        doc.fillColor(isHeader ? '#FFFFFF' : '#111827')
          .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isHeader ? 7.5 : 7)
          .text(text, x + 3, y + 5, { width: widths[index] - 6, lineBreak: false });
        x += widths[index];
      });
      y += rowHeight;
    };

    drawRow(headers, true, false);
    rows.forEach((row, index) => drawRow(row, false, index % 2 === 0));
    doc.y = y + 10;
  }

  private drawPdfTable(
    doc: PDFKit.PDFDocument,
    records: AttendanceRecord[],
    headers: string[],
    widths: number[],
    startX: number,
  ) {
    const ROW_H   = 18;
    const PAGE_B  = doc.page.height - (doc.page.margins as any).bottom;
    let y = doc.y;

    const drawRow = (cells: string[], isHeader: boolean, isEven: boolean) => {
      if (y + ROW_H > PAGE_B) {
        doc.addPage();
        y = (doc.page.margins as any).top;
        drawRow(headers, true, false); // repetir encabezado en nueva página
        return;
      }

      let x = startX;
      cells.forEach((text, i) => {
        const bg = isHeader ? '#1F2937' : isEven ? '#F9FAFB' : '#FFFFFF';
        doc.rect(x, y, widths[i], ROW_H).fill(bg).stroke('#E5E7EB');
        doc
          .fillColor(isHeader ? '#FFFFFF' : '#111827')
          .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isHeader ? 8 : 7.5)
          .text(text, x + 4, y + 5, { width: widths[i] - 8, lineBreak: false });
        x += widths[i];
      });
      y += ROW_H;
    };

    drawRow(headers, true, false);

    records.forEach((r, idx) => {
      drawRow(
        [
          r.userId,
          r.employee?.apellido ?? '—',
          r.employee?.nombre   ?? '—',
          fmtDate(r.timestamp),
          r.devicePunchStateLabel ?? STATUS_LABELS[r.status] ?? String(r.status),
          VERIFY_LABELS[r.verifyType] ?? String(r.verifyType),
          r.deviceSn,
        ],
        false,
        idx % 2 === 0,
      );
    });

    doc.y = y + 10;
  }
}
