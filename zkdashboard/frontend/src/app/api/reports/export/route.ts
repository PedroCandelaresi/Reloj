import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API = process.env.API_URL || 'http://localhost:4370';

const REPORTS: Record<string, { path: string; filename: string }> = {
  'daily-presence': {
    path: '/reports/daily-presence',
    filename: 'presencia-diaria.xlsx',
  },
  'incomplete-records': {
    path: '/reports/incomplete-records',
    filename: 'fichadas-incompletas.xlsx',
  },
  'monthly-summary': {
    path: '/reports/monthly-summary',
    filename: 'resumen-mensual.xlsx',
  },
  'late-arrivals': {
    path: '/reports/late-arrivals',
    filename: 'tardanzas.xlsx',
  },
  'early-departures': {
    path: '/reports/early-departures',
    filename: 'salidas-tempranas.xlsx',
  },
  absences: {
    path: '/reports/absences',
    filename: 'ausencias.xlsx',
  },
  'worked-hours': {
    path: '/reports/worked-hours',
    filename: 'horas-trabajadas-resumen.xlsx',
  },
  'manual-punches': {
    path: '/reports/manual-punches',
    filename: 'fichadas-manuales.xlsx',
  },
  'corrected-punches': {
    path: '/reports/corrected-punches',
    filename: 'fichadas-corregidas.xlsx',
  },
  'employees-without-schedule': {
    path: '/reports/employees-without-schedule',
    filename: 'empleados-sin-horario.xlsx',
  },
  'employees-without-punches': {
    path: '/reports/employees-without-punches',
    filename: 'empleados-sin-fichadas.xlsx',
  },
};

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const report = req.nextUrl.searchParams.get('report') ?? '';
  const config = REPORTS[report];
  if (!config) {
    return NextResponse.json({ error: 'Reporte no válido' }, { status: 400 });
  }

  const qs = new URLSearchParams();
  req.nextUrl.searchParams.forEach((value, key) => {
    if (value && key !== 'report') {
      qs.set(key, value);
    }
  });
  qs.set('format', 'excel');

  const upstream = await fetch(`${API}${config.path}?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!upstream.ok) {
    const message = await upstream.text();
    return NextResponse.json(
      { error: message || 'Error al exportar' },
      { status: upstream.status },
    );
  }

  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${config.filename}"`,
    },
  });
}
