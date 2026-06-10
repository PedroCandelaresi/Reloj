import type { Metadata } from 'next';
import Link from 'next/link';
import { TrackedWhatsAppLink } from '@/components/marketing/TrackedWhatsAppLink';
import { buildMarketingWhatsAppUrl } from '@/lib/marketing';

export const metadata: Metadata = {
  title: 'Control de asistencia con relojes biométricos | Conflunet',
  description:
    'Sistema mensual de control de asistencia, fichadas y control horario para empresas con relojes biométricos compatibles.',
  keywords: [
    'control de asistencia',
    'control horario',
    'fichadas',
    'relojes biométricos',
    'sistema de asistencia para empresas',
    'RRHH',
  ],
};

const whatsappIntro =
  'Hola Conflunet, quiero coordinar una reunión para conocer el sistema de control de asistencia.';

const meetingUrl = buildMarketingWhatsAppUrl({
  intro: whatsappIntro,
  service: 'Sistema de RRHH y fichadas',
});

const compatibilityUrl = buildMarketingWhatsAppUrl({
  intro: 'Hola Conflunet, quiero consultar si mi reloj biométrico es compatible con el sistema de control de asistencia.',
  service: 'Sistema de RRHH y fichadas',
});

const heroHighlights = [
  'Compatible con múltiples relojes',
  'Información centralizada',
  'Acceso web',
  'Menos tareas manuales',
] as const;

const problems = [
  'Descargas manuales desde el reloj y archivos que se pierden entre planillas.',
  'Registros dispersos que dificultan revisar ingresos, egresos y ausencias.',
  'Tiempo administrativo invertido en ordenar datos antes de poder analizarlos.',
  'Poca visibilidad diaria para RRHH, administración o encargados operativos.',
] as const;

const benefits = [
  'Menos tareas manuales para obtener las fichadas.',
  'Acceso web para consultar información organizada.',
  'Registros centralizados para equipos administrativos.',
  'Mejor control operativo de ingresos y egresos.',
  'Acompañamiento técnico durante relevamiento e implementación.',
] as const;

const steps = [
  {
    title: 'Relevamiento',
    description: 'Conocemos la operación, cantidad de empleados, sedes y relojes actuales.',
  },
  {
    title: 'Compatibilidad',
    description: 'Validamos si los equipos permiten integración o envío de registros.',
  },
  {
    title: 'Implementación',
    description: 'Configuramos la conexión y ordenamos la estructura inicial de uso.',
  },
  {
    title: 'Uso diario',
    description: 'La empresa consulta ingresos, egresos y fichadas desde la plataforma web.',
  },
] as const;

const useCases = [
  'Empresas con personal presencial',
  'Industrias y operaciones por turnos',
  'Comercios con varios horarios',
  'Oficinas administrativas',
  'Organizaciones con múltiples empleados',
] as const;

const faqs = [
  {
    question: '¿Funciona con cualquier reloj biométrico?',
    answer:
      'No prometemos compatibilidad universal. Primero revisamos si el reloj permite integración o envío de registros y evaluamos el caso antes de avanzar.',
  },
  {
    question: '¿Tengo que cambiar mis relojes actuales?',
    answer:
      'No necesariamente. El primer paso es relevar los equipos instalados y confirmar si pueden integrarse con la plataforma.',
  },
  {
    question: '¿Esto reemplaza la descarga manual de fichadas?',
    answer:
      'El objetivo es reducir o eliminar ese trabajo cuando la integración del reloj lo permite, centralizando la información en la web.',
  },
  {
    question: '¿Se vende como producto cerrado?',
    answer:
      'Se comercializa como servicio mensual, con relevamiento, implementación y acompañamiento técnico según el alcance de cada empresa.',
  },
  {
    question: '¿Hay prueba gratuita o demo automática?',
    answer:
      'No trabajamos con una demo automática estándar. Coordinamos una reunión breve para entender el caso y preparar una propuesta adecuada.',
  },
] as const;

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/85">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-8 text-slate-300">
        {description}
      </p>
    </div>
  );
}

function PrimaryCta({
  className = '',
  placement = 'control_asistencia_primary',
}: {
  className?: string;
  placement?: string;
}) {
  return (
    <TrackedWhatsAppLink
      href={meetingUrl}
      placement={placement}
      className={`inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 ${className}`}
    >
      Coordinar reunión
    </TrackedWhatsAppLink>
  );
}

function SecondaryCta({
  className = '',
  placement = 'control_asistencia_compatibility',
}: {
  className?: string;
  placement?: string;
}) {
  return (
    <TrackedWhatsAppLink
      href={compatibilityUrl}
      placement={placement}
      className={`inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10 ${className}`}
    >
      Consultar compatibilidad
    </TrackedWhatsAppLink>
  );
}

export default function ControlAsistenciaPage() {
  return (
    <>
      <section className="pt-12 pb-14 md:pt-8 md:pb-16 lg:pt-4 lg:pb-14">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-emerald-300/40 bg-emerald-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Conflunet Asistencia
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Control de asistencia conectado a relojes biométricos
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              Centralizá fichadas en una plataforma web y reducí descargas manuales para RRHH.
            </p>
            <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
              {heroHighlights.map((highlight) => (
                <div key={highlight} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-slate-950">
                    ✓
                  </span>
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryCta placement="control_asistencia_hero_primary" />
              <SecondaryCta placement="control_asistencia_hero_secondary" />
            </div>
            <p className="mt-4 text-sm leading-7 text-emerald-100/80">
              Coordinamos una reunión breve para relevar relojes, empleados y alcance de implementación.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#0b1111]/75 p-5 backdrop-blur-xl sm:p-6 lg:p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.2),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.08),transparent_42%)]" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/85">
                Flujo simple
              </p>
              <div className="mt-5 space-y-3">
                <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.06] p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-16 shrink-0 flex-col items-center rounded-2xl border border-emerald-200/30 bg-slate-950/70 p-2 shadow-2xl shadow-emerald-950/30">
                      <span className="h-3 w-8 rounded-full bg-emerald-300/80" />
                      <span className="mt-3 h-8 w-8 rounded-full border border-emerald-200/50 bg-emerald-300/10" />
                      <span className="mt-2 grid grid-cols-3 gap-1">
                        <span className="h-1 w-1 rounded-full bg-slate-400" />
                        <span className="h-1 w-1 rounded-full bg-slate-400" />
                        <span className="h-1 w-1 rounded-full bg-slate-400" />
                      </span>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">Reloj biométrico genérico</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">El personal registra ingresos y egresos en equipos compatibles.</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200/30 bg-emerald-300/15 text-base font-bold text-emerald-200" aria-hidden="true">
                    ↓
                  </span>
                </div>

                <div className="rounded-[1.5rem] border border-emerald-300/35 bg-emerald-300/12 p-4">
                  <div className="flex items-center gap-4">
                    <img
                      src="/brand/conflunet-isotipo.svg"
                      alt=""
                      aria-hidden="true"
                      className="h-12 w-12 shrink-0 object-contain"
                    />
                    <div>
                      <p className="text-lg font-semibold text-white">Conflunet</p>
                      <p className="mt-1 text-sm leading-6 text-emerald-50/80">Integra, ordena y centraliza los registros disponibles.</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200/30 bg-emerald-300/15 text-base font-bold text-emerald-200" aria-hidden="true">
                    ↓
                  </span>
                </div>

                <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.06] p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-20 shrink-0 items-end justify-center rounded-2xl border border-white/15 bg-slate-950/70 px-2 pb-2">
                      <span className="h-9 w-12 rounded-t-xl border border-emerald-200/40 bg-emerald-300/15" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">Acceso web para RRHH</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">La empresa consulta asistencia desde una plataforma web centralizada.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-[2rem] border border-white/15 bg-[#0b1111]/75 p-6 backdrop-blur-xl sm:p-8">
            <SectionIntro
              eyebrow="Problema actual"
              title="La descarga manual de fichadas consume tiempo y deja información dispersa"
              description="Cuando los registros dependen de archivos, planillas y controles manuales, RRHH pierde visibilidad diaria y el seguimiento de asistencia llega tarde."
            />
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {problems.map((problem) => (
                <div key={problem} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-200">
                  {problem}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/15 bg-[#0b1111]/75 p-6 backdrop-blur-xl sm:p-8">
            <SectionIntro
              eyebrow="Solución"
              title="Una plataforma web para ordenar las fichadas de su empresa"
              description="Conflunet Asistencia conecta la operación de los relojes compatibles con una vista web pensada para consultar registros sin depender de descargas manuales."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Integración', 'Recibe fichadas desde relojes biométricos compatibles.'],
              ['Centralización', 'Organiza ingresos y egresos en una plataforma web.'],
              ['Consulta remota', 'Permite revisar información desde el navegador.'],
              ['Servicio mensual', 'Incluye acompañamiento técnico según el alcance.'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-[1.5rem] border border-white/15 bg-white/5 p-5">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <SectionIntro
            eyebrow="Beneficios"
            title="Más control operativo, menos trabajo manual"
            description="La propuesta se enfoca en reducir tareas repetitivas y darle a la empresa una fuente más clara para revisar asistencia."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="rounded-2xl border border-white/15 bg-[#0b1111]/75 p-5 backdrop-blur-xl">
                <span className="inline-flex h-2 w-8 rounded-full bg-emerald-300" />
                <p className="mt-4 text-sm leading-7 text-slate-200">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-[2rem] border border-white/15 bg-[#0b1111]/75 p-6 backdrop-blur-xl sm:p-8">
            <SectionIntro
              eyebrow="Cómo funciona"
              title="Un proceso comercial pensado para relevar antes de prometer"
              description="No vendemos una prueba automática. Primero entendemos la operación, validamos compatibilidad y definimos una propuesta mensual."
            />
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-sm font-bold text-slate-950">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/15 bg-[#0b1111]/75 p-6 backdrop-blur-xl sm:p-8">
            <SectionIntro
              eyebrow="Compatibilidad"
              title="Compatible con relojes que permitan integración o envío de registros"
              description="Cada instalación se revisa antes de avanzar. Evaluamos el equipo instalado, su forma de conexión y el acceso a registros, sin prometer compatibilidad universal."
            />
            <div className="mt-7">
              <SecondaryCta placement="control_asistencia_compatibility_section" />
            </div>
          </div>
          <div className="rounded-[2rem] border border-emerald-300/30 bg-emerald-300/10 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">
              Para relevar
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-200">
              <li>Cantidad aproximada de empleados.</li>
              <li>Marca y modelo de relojes actuales.</li>
              <li>Sedes o puntos de fichada.</li>
              <li>Proceso actual de control horario.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <SectionIntro
            eyebrow="Casos de uso"
            title="Pensado para operaciones con personal presencial"
            description="La landing apunta a empresas que necesitan revisar asistencia, horarios y registros sin convertir el control diario en una tarea manual permanente."
          />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {useCases.map((useCase) => (
              <div key={useCase} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-200">
                {useCase}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-[2rem] border border-white/15 bg-[#0b1111]/75 p-6 backdrop-blur-xl sm:p-8">
            <SectionIntro
              eyebrow="Preguntas frecuentes"
              title="Lo que conviene aclarar antes de coordinar una reunión"
              description="El objetivo del primer contacto es saber si la implementación tiene sentido para la operación actual."
            />
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-base font-semibold text-white">{faq.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-16">
        <div className="mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
          <div className="rounded-[2rem] border border-emerald-300/30 bg-emerald-300/10 p-6 backdrop-blur-xl sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Próximo paso
            </p>
            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Coordinemos una reunión para evaluar el control de asistencia de su empresa
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-300">
              Revisamos relojes, empleados, sedes y proceso actual para preparar una propuesta mensual acorde al caso.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <PrimaryCta placement="control_asistencia_final_primary" />
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Acceso al sistema
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
