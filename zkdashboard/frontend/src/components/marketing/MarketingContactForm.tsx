'use client';

import { useMemo, useState } from 'react';
import {
  buildMarketingWhatsAppUrl,
  contactServiceOptions,
  type ContactFieldErrors,
  type ContactService,
  validateMarketingContactPayload,
} from '@/lib/marketing';

type SubmitState =
  | {
      type: 'success' | 'error';
      message: string;
      whatsappUrl: string;
    }
  | null;

type FormState = {
  name: string;
  phone: string;
  email: string;
  service: ContactService;
  message: string;
  company: string;
};

const defaultForm: FormState = {
  name: '',
  phone: '',
  email: '',
  service: contactServiceOptions[0],
  message: '',
  company: '',
};

const inputClassName =
  'w-full rounded-2xl border border-white/15 bg-[#0d1414] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/70 focus:bg-[#101919]';

export function MarketingContactForm() {
  const [values, setValues] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const whatsappUrl = useMemo(() => buildMarketingWhatsAppUrl(values), [values]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }
      return { ...current, [field]: undefined };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState(null);

    const validation = validateMarketingContactPayload(values);

    if (!validation.success) {
      setErrors(validation.fieldErrors);
      setSubmitState({
        type: 'error',
        message: validation.message,
        whatsappUrl,
      });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validation.data),
      });

      const data = (await response.json()) as {
        success: boolean;
        message: string;
        whatsappUrl: string;
        fieldErrors?: ContactFieldErrors;
      };

      if (!response.ok || !data.success) {
        setErrors(data.fieldErrors ?? {});
        throw new Error(data.message || 'No se pudo enviar tu consulta en este momento.');
      }

      setSubmitState({
        type: 'success',
        message: data.message,
        whatsappUrl: data.whatsappUrl,
      });
      setValues(defaultForm);
    } catch (error) {
      setSubmitState({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo enviar tu consulta en este momento.',
        whatsappUrl,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-200">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            className={inputClassName}
            placeholder="Tu nombre"
            value={values.name}
            onChange={(event) => updateField('name', event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name ? (
            <p id="name-error" className="mt-2 text-sm text-rose-300">{errors.name}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-medium text-slate-200">
            Teléfono
          </label>
          <input
            id="phone"
            name="phone"
            autoComplete="tel"
            inputMode="tel"
            className={inputClassName}
            placeholder="+54 9 ..."
            value={values.phone}
            onChange={(event) => updateField('phone', event.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
          />
          {errors.phone ? (
            <p id="phone-error" className="mt-2 text-sm text-rose-300">{errors.phone}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
            Email
          </label>
          <input
            id="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            className={inputClassName}
            placeholder="nombre@empresa.com"
            value={values.email}
            onChange={(event) => updateField('email', event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email ? (
            <p id="email-error" className="mt-2 text-sm text-rose-300">{errors.email}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="service" className="mb-2 block text-sm font-medium text-slate-200">
            Servicio
          </label>
          <select
            id="service"
            name="service"
            className={inputClassName}
            value={values.service}
            onChange={(event) => updateField('service', event.target.value as ContactService)}
            aria-invalid={Boolean(errors.service)}
            aria-describedby={errors.service ? 'service-error' : undefined}
          >
            {contactServiceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.service ? (
            <p id="service-error" className="mt-2 text-sm text-rose-300">{errors.service}</p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="message" className="mb-2 block text-sm font-medium text-slate-200">
          Mensaje
        </label>
        <textarea
          id="message"
          name="message"
          className={`${inputClassName} min-h-36 resize-y`}
          placeholder="Contanos qué necesitás resolver: soporte técnico, web, instalaciones o sistema de asistencia."
          value={values.message}
          onChange={(event) => updateField('message', event.target.value)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? 'message-error' : undefined}
        />
        {errors.message ? (
          <p id="message-error" className="mt-2 text-sm text-rose-300">{errors.message}</p>
        ) : null}
      </div>

      <div className="hidden" aria-hidden="true">
        <label htmlFor="company">Empresa</label>
        <input
          id="company"
          name="company"
          value={values.company}
          onChange={(event) => updateField('company', event.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar consulta'}
        </button>

        <a
          href={submitState?.whatsappUrl ?? whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Contactar por WhatsApp
        </a>
      </div>

      {submitState ? (
        <p
          className={`rounded-2xl border px-4 py-3 text-sm ${
            submitState.type === 'success'
              ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
              : 'border-rose-300/30 bg-rose-300/10 text-rose-100'
          }`}
        >
          {submitState.message}
        </p>
      ) : null}
    </form>
  );
}
