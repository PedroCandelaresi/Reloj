'use client';

type AnalyticsValue = string | number | boolean;
type AnalyticsParams = Record<string, AnalyticsValue | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function sanitizeParams(params: AnalyticsParams = {}) {
  return Object.entries(params).reduce<Record<string, AnalyticsValue>>((safeParams, [key, value]) => {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      safeParams[key] = value;
    }

    return safeParams;
  }, {});
}

function logDevelopmentEvent(eventName: string, params: Record<string, AnalyticsValue>) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  console.info('[analytics]', eventName, params);
}

export function trackEvent(eventName: string, params?: AnalyticsParams) {
  if (typeof window === 'undefined') {
    return;
  }

  const safeParams = sanitizeParams(params);

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: eventName,
      ...safeParams,
    });
  }

  logDevelopmentEvent(eventName, safeParams);
}

export function trackWhatsAppClick(params?: AnalyticsParams) {
  trackEvent('whatsapp_click', params);
}

export function trackContactFormPrepared(params?: AnalyticsParams) {
  trackEvent('contact_form_prepared', params);
}

export function trackEmailClick(params?: AnalyticsParams) {
  trackEvent('email_click', params);
}
