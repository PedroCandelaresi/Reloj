import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import PDFDocument = require('pdfkit');
import { AttendanceRecord } from './attendance.entity';
import { Employee } from '../employees/employee.entity';

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
  }): Promise<AttendanceRecord[]> {
    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndMapOne('r.employee', Employee, 'e', 'e.id = r.user_id');
    if (opts.userId) qb.andWhere('r.user_id = :userId', { userId: opts.userId });
    if (opts.dateFrom) qb.andWhere('r.timestamp >= :df', { df: new Date(opts.dateFrom) });
    if (opts.dateTo) {
      const to = new Date(opts.dateTo);
      to.setDate(to.getDate() + 1);
      qb.andWhere('r.timestamp < :dt', { dt: to });
    }
    return qb.orderBy('r.timestamp', 'ASC').getMany();
  }

  // ─── Excel ────────────────────────────────────────────────────────────────

  async exportExcel(opts: {
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Buffer> {
    const records = await this.getFiltered(opts);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ZK Dashboard';
    wb.created = new Date();

    const ws = wb.addWorksheet('Asistencia', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
    });

    ws.columns = [
      { header: 'ID Empleado', key: 'userId',     width: 14 },
      { header: 'Apellido',    key: 'apellido',   width: 20 },
      { header: 'Nombre',      key: 'nombre',     width: 20 },
      { header: 'Fecha y Hora', key: 'timestamp', width: 24 },
      { header: 'Estado',       key: 'status',    width: 16 },
      { header: 'Verificación', key: 'verify',    width: 14 },
      { header: 'Cód. Trabajo', key: 'workCode',  width: 14 },
      { header: 'Dispositivo',  key: 'device',    width: 14 },
    ];

    // Header styling
    ws.getRow(1).height = 26;
    ws.getRow(1).eachCell((cell) => {
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

    ws.views          = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter     = { from: { row: 1, column: 1 }, to: { row: 1, column: 8 } };

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // ─── PDF ──────────────────────────────────────────────────────────────────

  async exportPdf(opts: {
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Buffer> {
    const records = await this.getFiltered(opts);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size:   'A4',
        layout: 'landscape',
        margin: 40,
        info:   { Title: 'Registros de Asistencia', Author: 'ZK Dashboard' },
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
        .text(
          `Generado el ${fmtDate(new Date())}  ·  ${records.length} registros`,
          { align: 'center' },
        );

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
