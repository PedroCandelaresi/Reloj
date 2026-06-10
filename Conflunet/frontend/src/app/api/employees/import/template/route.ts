import { NextResponse } from 'next/server';

export async function GET() {
  const csv = [
    'documento,nombre,apellido,sector,puesto,perfil_horario,activo',
    '35187701,Andrea Del Carmen,Espinoza,Administración,Administrativa,Administración lunes a viernes,Sí',
  ].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="plantilla-empleados.csv"',
    },
  });
}
