import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import PDFDocument = require('pdfkit');
import { AttendanceRecord } from './attendance.entity';
import { Employee } from '../employees/employee.entity';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { getCompanyScope } from '../auth/company-scope.util';

const STATUS_LABELS: Record<number, string> = {
  0: 'Entrada',
  1: 'Salida',
  2: 'Descanso Sal.',
  3: 'Descanso Ent.',
  4: 'Extra Entrada',
  5: 'Extra Salida',
};

const VERIFY_LABELS: Record<number, string> = {
  0: 'Contraseña',
  1: 'Huella',
  4: 'Rostro',
  15: 'Tarjeta',
};

function fmtDate(date: Date | string): string {
  return new Date(date).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function fmtDateOnly(date: string): string {
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly repo: Repository<AttendanceRecord>,
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
    if (opts.dateFrom) qb.andWhere('r.timestamp >= :df', { df: new Date(opts.dateFrom) });
    if (opts.dateTo) {
      const to = new Date(opts.dateTo);
      to.setDate(to.getDate() + 1);
      qb.andWhere('r.timestamp < :dt', { dt: to });
    }
    return qb.orderBy('r.timestamp', 'ASC').getMany();
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

  // ─── Excel ────────────────────────────────────────────────────────────────

  async exportExcel(opts: {
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }, user: AuthenticatedUser): Promise<Buffer> {
    const records = await this.getFiltered(opts, user);
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
      { key: 'status',    width: 16 },
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
      status: 'Estado',
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
        status:    STATUS_LABELS[r.status]     ?? String(r.status),
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
      const headers = ['ID Empleado', 'Apellido', 'Nombre', 'Fecha y Hora', 'Estado', 'Verificación', 'Dispositivo'];
      const widths  = [70,             115,        105,       135,            85,       90,             115];

      this.drawPdfTable(doc, records, headers, widths, 40);

      doc.end();
    });
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
          STATUS_LABELS[r.status]     ?? String(r.status),
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
