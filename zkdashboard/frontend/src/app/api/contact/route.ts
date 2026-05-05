import { NextResponse } from 'next/server';
import {
  buildMarketingWhatsAppUrl,
  validateMarketingContactPayload,
} from '@/lib/marketing';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateMarketingContactPayload(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.message,
          fieldErrors: validation.fieldErrors,
          whatsappUrl: buildMarketingWhatsAppUrl(),
        },
        { status: 422 },
      );
    }

    const payload = validation.data;
    const whatsappUrl = buildMarketingWhatsAppUrl(payload);

    // Honeypot simple anti-spam: respondemos éxito sin procesar.
    if (payload.company) {
      return NextResponse.json({
        success: true,
        message: 'Recibimos tu mensaje. Si querés, continuamos por WhatsApp.',
        whatsappUrl,
      });
    }

    console.info('[marketing-contact]', {
      createdAt: new Date().toISOString(),
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      service: payload.service,
      message: payload.message,
    });

    return NextResponse.json({
      success: true,
      message: 'Consulta enviada correctamente. También podés continuar por WhatsApp.',
      whatsappUrl,
    });
  } catch (error) {
    console.error('[marketing-contact-error]', error);

    return NextResponse.json(
      {
        success: false,
        message: 'No pudimos procesar tu solicitud ahora. Probá por WhatsApp.',
        whatsappUrl: buildMarketingWhatsAppUrl(),
      },
      { status: 500 },
    );
  }
}
