import Link from 'next/link';
import { HolidaysManager } from '@/components/HolidaysManager';
import { CompanyRequiredMessage } from '@/components/reports/CompanyRequiredMessage';
import { getHolidays } from '@/lib/api';
import { currentArgentinaPeriod } from '@/lib/argentina-date';
import { requireCurrentSession } from '@/lib/session';

interface PageProps {
  searchParams: Promise<{
    year?: string;
    month?: string;
    companyId?: string;
  }>;
}

export default async function HolidaysPage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const companyId = sp.companyId || '';
  if (user.isSuperAdmin && !companyId) {
    return <CompanyRequiredMessage reportName="Feriados" />;
  }
  const fallback = currentArgentinaPeriod();
  const year = sp.year || fallback.year;
  const month = sp.month || fallback.month;
  const holidays = await getHolidays({ year, month, companyId: companyId || undefined });
  const backHref = user.companyRole === 'company_admin' && !user.isSuperAdmin
    ? '/settings'
    : `/reports${companyId ? `?companyId=${companyId}` : ''}`;

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href={backHref} className="mb-2 block text-sm font-medium" style={{ color: 'var(--brand-text)' }}>
              ← Volver
            </Link>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Feriados</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Carga manual de feriados para el cálculo diario de asistencia.
            </p>
          </div>
          <form action="/settings/holidays" className="flex flex-wrap items-end gap-3">
            {companyId && <input type="hidden" name="companyId" value={companyId} />}
            <label className="text-sm">
              <span className="mb-1 block font-medium" style={{ color: 'var(--text-secondary)' }}>Año</span>
              <input name="year" defaultValue={year} inputMode="numeric" pattern="[0-9]{4}"
                className="w-28 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium" style={{ color: 'var(--text-secondary)' }}>Mes</span>
              <select name="month" defaultValue={month}
                className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              >
                {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((value) => (
                  <option key={value} value={value}>{value.padStart(2, '0')}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Filtrar
            </button>
          </form>
        </div>

        <HolidaysManager holidays={holidays} user={user} companyId={companyId || undefined} />
      </main>
    </>
  );
}
