import { Navbar } from '@/components/Navbar';
import { getAdminDashboard } from '@/lib/api';
import { requireSuperAdminSession } from '@/lib/session';
import Link from 'next/link';
import type { ReactNode } from 'react';

const TZ = 'America/Argentina/Buenos_Aires';

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: TZ,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
}

export default async function AdminDashboardPage() {
  const user = await requireSuperAdminSession();
  const dashboard = await getAdminDashboard();
  const { summary } = dashboard;

  return (
    <>
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--brand-text)' }}>
            Administración global
          </p>
          <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            Panel global del sistema
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Monitoreo multiempresa de operación, dispositivos, ADMS y salud técnica.
          </p>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <MetricCard label="Empresas" value={summary.totalCompanies} hint={`${summary.activeCompanies} activas`} />
          <MetricCard label="Usuarios" value={summary.totalUsers} hint="Cuentas administrativas" />
          <MetricCard label="Empleados" value={summary.totalEmployees} hint="Maestra actual" />
          <MetricCard label="Dispositivos" value={summary.totalDevices} hint={`${summary.unassignedDevices} sin empresa`} />
          <MetricCard label="Online" value={summary.devicesOnline} hint="Relojes con heartbeat reciente" tone="green" />
          <MetricCard label="Offline" value={summary.devicesOffline} hint="Revisar conectividad" tone="slate" />
          <MetricCard label="Fichadas hoy" value={summary.totalAttendanceToday} hint="Global del sistema" tone="blue" />
          <MetricCard label="Pendientes" value={summary.pendingCommands} hint="Comandos por retirar" tone="amber" />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Panel title="Actividad de fichadas">
            <div className="space-y-3">
              {summary.attendanceLast7Days.length === 0 ? (
                <EmptyText text="Sin fichadas en los últimos 7 días." />
              ) : (
                summary.attendanceLast7Days.map((item) => (
                  <div key={item.date} className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>{item.date}</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.count}</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-5 rounded-lg border px-4 py-3 text-sm" style={{ background: 'var(--amber-soft)', borderColor: 'rgba(251,191,36,0.3)', color: 'var(--amber-text)' }}>
              Registros sin empresa: <strong>{summary.attendanceCompanyNull}</strong>
            </div>
          </Panel>

          <Panel title="Estado de dispositivos">
            <div className="space-y-3">
              {dashboard.latestDevices.map((device) => (
                <div key={device.id} className="flex items-start justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{device.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {device.serialNumber} · {device.companyName || 'Sin empresa'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      device.online
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {device.online ? 'Online' : 'Offline'}
                    </span>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{formatDate(device.lastSeen)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Panel title="Empresas con problemas">
            {dashboard.companiesWithOfflineDevices.length === 0 ? (
              <EmptyText text="Sin empresas con dispositivos offline." />
            ) : (
              <div className="space-y-3">
                {dashboard.companiesWithOfflineDevices.map((company) => (
                  <div key={company.companyId || 'unassigned'} className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>{company.companyName}</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">{company.offlineDevices}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Últimos eventos ADMS">
            {dashboard.latestAdmsErrors.length === 0 ? (
              <EmptyText text="Sin errores ADMS recientes." />
            ) : (
              <div className="space-y-3">
                {dashboard.latestAdmsErrors.map((event) => (
                  <div key={event.id} className="text-sm">
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {event.serialNumber || 'Sin SN'} · {event.responseStatus || 'sin status'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{event.path} · {formatDate(event.receivedAt)}</p>
                    {event.parseError && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1 truncate">{event.parseError}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Alertas técnicas">
            <div className="space-y-3">
              {dashboard.technicalAlerts.map((alert) => (
                <p key={alert} className="rounded-lg border px-3 py-2 text-sm" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  {alert}
                </p>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <Link href="/admin/companies" className="text-sm font-medium transition-colors" style={{ color: 'var(--brand-text)' }}>
                Empresas
              </Link>
              <Link href="/admin/devices" className="text-sm font-medium transition-colors" style={{ color: 'var(--brand-text)' }}>
                Dispositivos
              </Link>
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Panel title="Últimas empresas creadas">
            <div className="space-y-3">
              {dashboard.latestCompanies.map((company) => (
                <div key={company.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {company.nombreFantasia || company.razonSocial}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{company.cuit}</p>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(company.createdAt)}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Empresas con más fichadas hoy">
            {dashboard.topCompaniesToday.length === 0 ? (
              <EmptyText text="Todavía no hay fichadas hoy." />
            ) : (
              <div className="space-y-3">
                {dashboard.topCompaniesToday.map((company) => (
                  <div key={company.companyId} className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>{company.companyName}</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{company.count}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </main>
    </>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = 'emerald',
}: {
  label: string;
  value: number;
  hint: string;
  tone?: 'emerald' | 'green' | 'slate' | 'blue' | 'amber';
}) {
  const colors = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    green:   'text-green-600 dark:text-green-400',
    slate:   'text-slate-600 dark:text-slate-400',
    blue:    'text-blue-600 dark:text-blue-400',
    amber:   'text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="card rounded-xl p-5">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className={`mt-2 text-3xl font-bold ${colors[tone]}`}>{value}</p>
      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{hint}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card rounded-xl p-6">
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {children}
    </section>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{text}</p>;
}
