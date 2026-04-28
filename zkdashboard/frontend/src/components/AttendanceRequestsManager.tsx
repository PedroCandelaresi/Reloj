'use client';

import { useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveAttendanceRequestAction,
  cancelAttendanceRequestAction,
  createAttendanceRequestAction,
  rejectAttendanceRequestAction,
} from '@/app/(protected)/attendance/requests/actions';
import {
  formatEmployeeName,
  type AttendanceAuditLog,
  type AttendancePunchType,
  type AttendanceRequest,
  type AttendanceRequestInput,
  type AttendanceRequestType,
  type AttendanceUserOption,
  type CurrentUserProfile,
} from '@/lib/api';
import { formatArgentinaDateTime } from '@/lib/argentina-date';

type FormValues = {
  employeeId: string;
  type: AttendanceRequestType;
  date: string;
  punchTime: string;
  punchType: AttendancePunchType;
  targetAttendanceRecordId: string;
  newPunchTime: string;
  reason: string;
  autoApprove: boolean;
};

const EMPTY_FORM: FormValues = {
  employeeId: '',
  type: 'manual_punch',
  date: '',
  punchTime: '',
  punchType: 'unknown',
  targetAttendanceRecordId: '',
  newPunchTime: '',
  reason: '',
  autoApprove: false,
};

const TYPE_LABELS: Record<AttendanceRequestType, string> = {
  manual_punch: 'Fichada manual',
  punch_correction: 'Corrección de fichada',
  absence_justification: 'Justificación de ausencia',
  late_justification: 'Justificación de tardanza',
};

const STATUS_LABELS: Record<AttendanceRequest['status'], string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

function canCreate(user: CurrentUserProfile) {
  return user.isSuperAdmin || user.companyRole === 'company_admin' || user.companyRole === 'operator';
}

function canReview(user: CurrentUserProfile) {
  return user.isSuperAdmin || user.companyRole === 'company_admin';
}

export function AttendanceRequestsManager({
  requests,
  auditLogs,
  userOptions,
  user,
}: {
  requests: AttendanceRequest[];
  auditLogs: AttendanceAuditLog[];
  userOptions: AttendanceUserOption[];
  user: CurrentUserProfile;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [reviewNotesById, setReviewNotesById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const writable = canCreate(user);
  const reviewer = canReview(user);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleAutoApprove = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, autoApprove: event.target.checked }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (!writable) return;

    const payload: AttendanceRequestInput = {
      employeeId: form.employeeId,
      type: form.type,
      date: form.date,
      reason: form.reason,
      autoApprove: reviewer && form.autoApprove,
      punchType: form.type === 'manual_punch' ? form.punchType : undefined,
      punchTime: form.type === 'manual_punch' ? form.punchTime : undefined,
      targetAttendanceRecordId: form.type === 'punch_correction' ? Number(form.targetAttendanceRecordId) : undefined,
      newPunchTime: form.type === 'punch_correction' ? form.newPunchTime : undefined,
    };

    startTransition(() => {
      void createAttendanceRequestAction(payload).then((result) => {
        if (result.error) {
          setMessage({ type: 'error', text: result.error });
          return;
        }
        setForm(EMPTY_FORM);
        setMessage({ type: 'success', text: 'Solicitud creada correctamente.' });
        router.refresh();
      });
    });
  };

  const review = (id: string, action: 'approve' | 'reject' | 'cancel') => {
    setMessage(null);
    const notes = reviewNotesById[id] ?? '';
    startTransition(() => {
      const task =
        action === 'approve'
          ? approveAttendanceRequestAction(id, notes)
          : action === 'reject'
            ? rejectAttendanceRequestAction(id, notes)
            : cancelAttendanceRequestAction(id);
      void task.then((result) => {
        if (result.error) {
          setMessage({ type: 'error', text: result.error });
          return;
        }
        setMessage({ type: 'success', text: 'Solicitud actualizada.' });
        router.refresh();
      });
    });
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-lg border px-4 py-3 text-sm" style={
          message.type === 'success'
            ? { background: 'var(--brand-soft)', borderColor: 'rgba(31,199,119,0.3)', color: 'var(--brand-text)' }
            : { background: 'var(--danger-soft)', borderColor: 'rgba(230,45,66,0.3)', color: 'var(--danger-text)' }
        }>
          {message.text}
        </div>
      )}

      {writable && (
        <section className="card rounded-xl">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nueva solicitud</h2>
          </div>
          <form onSubmit={submit} className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-4">
            <Field label="Empleado">
              <select name="employeeId" value={form.employeeId} onChange={handleChange} required className="input-field w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Seleccionar</option>
                {userOptions.map((option) => (
                  <option key={option.userId} value={option.userId}>
                    {formatEmployeeName(option.employee) ?? option.userId}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo">
              <select name="type" value={form.type} onChange={handleChange} className="input-field w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Fecha">
              <input type="date" name="date" value={form.date} onChange={handleChange} required className="input-field w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </Field>
            {form.type === 'manual_punch' && (
              <>
                <Field label="Hora fichada">
                  <input type="datetime-local" name="punchTime" value={form.punchTime} onChange={handleChange} required className="input-field w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </Field>
                <Field label="Tipo fichada">
                  <select name="punchType" value={form.punchType} onChange={handleChange} className="input-field w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="unknown">Sin definir</option>
                    <option value="in">Entrada</option>
                    <option value="out">Salida</option>
                  </select>
                </Field>
              </>
            )}
            {form.type === 'punch_correction' && (
              <>
                <Field label="ID fichada">
                  <input name="targetAttendanceRecordId" value={form.targetAttendanceRecordId} onChange={handleChange} inputMode="numeric" required className="input-field w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </Field>
                <Field label="Nueva hora">
                  <input type="datetime-local" name="newPunchTime" value={form.newPunchTime} onChange={handleChange} required className="input-field w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </Field>
              </>
            )}
            <label className="lg:col-span-4 text-sm">
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Motivo</span>
              <textarea name="reason" value={form.reason} onChange={handleChange} required rows={3} className="input-field w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1" />
            </label>
            {reviewer && (
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={form.autoApprove} onChange={handleAutoApprove} />
                Aprobar automáticamente
              </label>
            )}
            <div className="lg:col-span-4 flex justify-end">
              <button type="submit" disabled={isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                Crear solicitud
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card rounded-xl">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Solicitudes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header-row text-xs uppercase">
                <th className="px-6 py-4 text-left">Empleado</th>
                <th className="px-6 py-4 text-left">Fecha</th>
                <th className="px-6 py-4 text-left">Tipo</th>
                <th className="px-6 py-4 text-left">Estado</th>
                <th className="px-6 py-4 text-left">Detalle</th>
                <th className="px-6 py-4 text-left">Revisión</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                    No hay solicitudes para los filtros seleccionados.
                  </td>
                </tr>
              ) : requests.map((request) => (
                <tr key={request.id} className="table-row align-top">
                  <td className="px-6 py-4">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {formatEmployeeName(request.employee) ?? request.employeeId}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{request.employeeId}</div>
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{request.date}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{TYPE_LABELS[request.type]}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{STATUS_LABELS[request.status]}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>
                    <p>{request.reason}</p>
                    {request.punchTime && <p className="mt-1 text-xs">Fichada: {formatArgentinaDateTime(request.punchTime)}</p>}
                    {request.newPunchTime && <p className="mt-1 text-xs">Nueva hora: {formatArgentinaDateTime(request.newPunchTime)}</p>}
                    {request.targetAttendanceRecordId && <p className="mt-1 text-xs">Registro #{request.targetAttendanceRecordId}</p>}
                  </td>
                  <td className="px-6 py-4">
                    {request.status === 'pending' ? (
                      <div className="space-y-2">
                        <input
                          value={reviewNotesById[request.id] ?? ''}
                          onChange={(event) => setReviewNotesById((current) => ({ ...current, [request.id]: event.target.value }))}
                          placeholder="Notas de revisión"
                          className="input-field w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="flex flex-wrap gap-2">
                          {reviewer && (
                            <>
                              <button type="button" onClick={() => review(request.id, 'approve')} disabled={isPending} className="font-medium" style={{ color: 'var(--brand-text)' }}>
                                Aprobar
                              </button>
                              <button type="button" onClick={() => review(request.id, 'reject')} disabled={isPending} className="font-medium" style={{ color: 'var(--danger-text)' }}>
                                Rechazar
                              </button>
                            </>
                          )}
                          {(reviewer || request.requestedByUserId === user.id) && (
                            <button type="button" onClick={() => review(request.id, 'cancel')} disabled={isPending} className="font-medium" style={{ color: 'var(--text-muted)' }}>
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>{request.reviewNotes || '-'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card rounded-xl">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Auditoría reciente</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header-row text-xs uppercase">
                <th className="px-6 py-4 text-left">Fecha</th>
                <th className="px-6 py-4 text-left">Acción</th>
                <th className="px-6 py-4 text-left">Empleado</th>
                <th className="px-6 py-4 text-left">Solicitud</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center" style={{ color: 'var(--text-muted)' }}>Sin auditoría en el rango.</td></tr>
              ) : auditLogs.map((log) => (
                <tr key={log.id} className="table-row">
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatArgentinaDateTime(log.createdAt)}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{log.action}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{formatEmployeeName(log.employee) ?? log.employeeId ?? '-'}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{log.attendanceRequestId ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
