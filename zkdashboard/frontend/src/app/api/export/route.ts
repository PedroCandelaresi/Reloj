import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API = process.env.API_URL || 'http://localhost:4370';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Reenviar todos los query params al backend
  const sp = req.nextUrl.searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Array.from(sp.entries())) {
    if (value) qs.set(key, value);
  }

  const format = sp.get('format') ?? 'excel';
  const report = sp.get('report') ?? 'records';

  const upstream = await fetch(`${API}/attendance/export?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: 'Error al exportar' }, { status: upstream.status });
  }

  const buffer = await upstream.arrayBuffer();

  const isExcel = format === 'excel';
  const contentType = isExcel
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/pdf';
  const filenamePrefix = report === 'hours' ? 'horas-trabajadas' : 'asistencia';
  const filename = isExcel ? `${filenamePrefix}.xlsx` : `${filenamePrefix}.pdf`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
