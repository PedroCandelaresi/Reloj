export const marketingConfig = {
  brandName: 'Conflunet',
  whatsappNumber: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '5492994668764').replace(/\D/g, ''),
  whatsappDisplay: '+54 9 299 466-8764',
  contactEmail: 'info@conflunet.com.ar',
  supportTagline: 'Atención cercana y soporte real',
} as const;

export const marketingNavItems = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#servicios-anchor', label: 'Servicios' },
  { href: '#rrhh-anchor', label: 'Sistema RRHH' },
  { href: '#contacto-anchor', label: 'Contacto' },
] as const;

export const contactServiceOptions = [
  'Servicio técnico',
  'Diseño web comercial',
  'Instalaciones técnicas',
  'Sistema de RRHH y fichadas',
  'Consulta general',
] as const;

export type ContactService = (typeof contactServiceOptions)[number];

export type MarketingContactPayload = {
  name: string;
  phone: string;
  email: string;
  service: ContactService;
  message: string;
  company?: string;
};

export type ContactFieldErrors = Partial<Record<keyof MarketingContactPayload, string>>;

const PHONE_REGEX = /^[0-9+()\-\s]{8,24}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function sanitizeInline(value: string) {
  return normalizeSpaces(value.replace(/[<>]/g, ''));
}

function sanitizeMultiline(value: string) {
  return value
    .replace(/[<>]/g, '')
    .split(/\r?\n/)
    .map((line) => normalizeSpaces(line))
    .filter(Boolean)
    .join('\n');
}

function toStringSafe(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function validateMarketingContactPayload(
  input: unknown,
):
  | { success: true; data: MarketingContactPayload }
  | { success: false; message: string; fieldErrors: ContactFieldErrors } {
  const source = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;

  const payload: MarketingContactPayload = {
    name: sanitizeInline(toStringSafe(source.name)),
    phone: sanitizeInline(toStringSafe(source.phone)),
    email: sanitizeInline(toStringSafe(source.email)).toLowerCase(),
    service: sanitizeInline(toStringSafe(source.service)) as ContactService,
    message: sanitizeMultiline(toStringSafe(source.message)),
    company: sanitizeInline(toStringSafe(source.company)),
  };

  const fieldErrors: ContactFieldErrors = {};

  if (payload.name.length < 2 || payload.name.length > 80) {
    fieldErrors.name = 'Ingresá un nombre válido (2 a 80 caracteres).';
  }

  if (!PHONE_REGEX.test(payload.phone)) {
    fieldErrors.phone = 'Ingresá un teléfono válido.';
  }

  if (payload.email.length > 120 || !EMAIL_REGEX.test(payload.email)) {
    fieldErrors.email = 'Ingresá un email válido.';
  }

  if (!contactServiceOptions.includes(payload.service)) {
    fieldErrors.service = 'Seleccioná un servicio válido.';
  }

  if (payload.message.length < 10 || payload.message.length > 1200) {
    fieldErrors.message = 'El mensaje debe tener entre 10 y 1200 caracteres.';
  }

  if (payload.company && payload.company.length > 200) {
    fieldErrors.company = 'Valor inválido.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: 'Revisá los datos del formulario e intentá nuevamente.',
      fieldErrors,
    };
  }

  return {
    success: true,
    data: payload,
  };
}

export function buildMarketingWhatsAppUrl(payload?: Partial<MarketingContactPayload>) {
  const service =
    payload?.service && contactServiceOptions.includes(payload.service)
      ? payload.service
      : contactServiceOptions[0];

  const lines = [
    `Hola ${marketingConfig.brandName}, quiero consultar por ${service}.`,
    payload?.name ? `Nombre: ${payload.name}` : null,
    payload?.phone ? `Teléfono: ${payload.phone}` : null,
    payload?.email ? `Email: ${payload.email}` : null,
    payload?.message ? `Mensaje: ${payload.message}` : null,
  ].filter(Boolean);

  const text = encodeURIComponent(lines.join('\n'));

  return `https://wa.me/${marketingConfig.whatsappNumber}?text=${text}`;
}
