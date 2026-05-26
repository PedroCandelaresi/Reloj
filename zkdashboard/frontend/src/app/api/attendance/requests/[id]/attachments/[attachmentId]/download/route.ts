import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API = process.env.API_URL || 'http://localhost:4370';

function extractUpstreamMessage(body: string) {
  if (!body) return 'No se pudo descargar el adjunto.';
  try {
    const payload = JSON.parse(body) as { message?: string | string[]; error?: string };
    if (Array.isArray(payload.message)) return payload.message.join(', ');
    return payload.message || payload.error || body;
  } catch {
    return body;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; attachmentId: string } },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const upstream = await fetch(`${API}/attendance/requests/${params.id}/attachments/${params.attachmentId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!upstream.ok) {
    const message = extractUpstreamMessage(await upstream.text());
    return new NextResponse(message, {
      status: upstream.status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Disposition': upstream.headers.get('Content-Disposition') ?? 'attachment',
    },
  });
}
