import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API = process.env.API_URL || 'http://localhost:4370';

function extractUpstreamMessage(body: string) {
  if (!body) return 'No se pudieron cargar los adjuntos.';
  try {
    const payload = JSON.parse(body) as { message?: string | string[]; error?: string };
    if (Array.isArray(payload.message)) return payload.message.join(', ');
    return payload.message || payload.error || body;
  } catch {
    return body;
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const upstream = await fetch(`${API}/attendance/requests/${params.id}/attachments`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const body = await upstream.text();
  if (!upstream.ok) {
    return new NextResponse(extractUpstreamMessage(body), {
      status: upstream.status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  });
}
