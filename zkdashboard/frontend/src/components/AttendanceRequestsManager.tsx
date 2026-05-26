'use client';

import { useEffect, useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveAttendanceRequestAction,
  cancelAttendanceRequestAction,
  createAttendanceRequestAction,
  deleteAttendanceRequestAttachmentAction,
  rejectAttendanceRequestAction,
  uploadAttendanceRequestAttachmentAction,
} from '@/app/(protected)/attendance/requests/actions';
import { MaskedDateInput, MaskedDateTimeInput } from '@/components/MaskedDateInput';
import {
  type AttendanceAuditLog,
  type AttendanceJustificationType,
  type AttendancePunchType,
  type AttendanceRequest,
  type AttendanceRequestAttachment,
  type AttendanceRequestInput,
  type AttendanceRequestType,
  type AttendanceUserOption,
  type CurrentUserProfile,
} from '@/lib/api';
import { formatArgentinaDateTime } from '@/lib/argentina-date';
import { formatEmployeeName } from '@/lib/format-employee';
import { humanizeActionError } from '@/lib/ux-labels';

type FormValues = {
  employeeId: string;
  type: AttendanceRequestType;
  date: string;
  punchTime: string;
  punchType: AttendancePunchType;
  targetAttendanceRecordId: string;
  newPunchTime: string;
  reason: string;
  justificationTypeId: string;
  autoApprove: boolean;
};

const EMPTY_FORM: FormValues = {
  employeeId: '',
  type: 'absence_justification',
  date: '',
  punchTime: '',
  punchType: 'unknown',
  targetAttendanceRecordId: '',
  newPunchTime: '',
  reason: '',
  justificationTypeId: '',
  autoApprove: false,
};

const TYPE_LABELS: Record<AttendanceRequestType, string> = {
  absence_justification: 'Justificación de ausencia',
  late_justification: 'Justificación de tardanza',
  punch_correction: 'Corrección de fichada',
  manual_punch: 'Fichada manual',
};

const STATUS_LABELS: Record<AttendanceRequest['status'], string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

const TYPE_HELP: Record<AttendanceRequestType, string> = {
  manual_punch: 'Agrega una fichada que el reloj no registró.',
  punch_correction: 'Modifica una fichada existente y deja auditoría.',
  absence_justification: 'Marca una ausencia como justificada sin borrar el registro.',
  late_justification: 'La tardanza sigue registrada, pero queda justificada por RRHH.',
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
  justificationTypes,
  user,
  initialForm,
  fromReport,
}: {
  requests: AttendanceRequest[];
  auditLogs: AttendanceAuditLog[];
  userOptions: AttendanceUserOption[];
  justificationTypes: AttendanceJustificationType[];
  user: CurrentUserProfile;
  initialForm?: FormValues;
  fromReport?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormValues>(initialForm ?? EMPTY_FORM);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentsByRequest, setAttachmentsByRequest] = useState<Record<string, AttendanceRequestAttachment[]>>({});
  const [reviewNotesById, setReviewNotesById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const writable = canCreate(user);
  const reviewer = canReview(user);
  const visibleRequestTypes = Object.entries(TYPE_LABELS).filter(
    ([value]) => reviewer || (value !== 'manual_punch' && value !== 'punch_correction'),
  );

  useEffect(() => {
    if (!reviewer && (form.type === 'manual_punch' || form.type === 'punch_correction')) {
      setForm((current) => ({ ...current, type: 'absence_justification' }));
    }
  }, [form.type, reviewer]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'type' ? { justificationTypeId: '' } : {}),
    }));
  };

  const handleAutoApprove = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, autoApprove: event.target.checked }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (!writable) {
      setMessage({ type: 'error', text: 'No tenés permisos para realizar esta acción. Podés consultar la información, pero no modificarla.' });
      return;
    }
    if (reviewer && form.autoApprove && form.type === 'manual_punch') {
      if (!window.confirm('Vas a cargar una fichada manual y aprobarla automáticamente. La solicitud quedará aprobada al crearla. ¿Continuás?')) return;
    }
    if (form.type === 'punch_correction') {
      if (!window.confirm('Vas a corregir una fichada existente. El cambio quedará registrado en la auditoría. ¿Continuás?')) return;
    }
    if (form.type === 'manual_punch' && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(form.punchTime)) {
      setMessage({ type: 'error', text: 'Completá fecha y hora de la fichada manual.' });
      return;
    }
    if (form.type === 'punch_correction' && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(form.newPunchTime)) {
      setMessage({ type: 'error', text: 'Completá la nueva fecha y hora de la corrección.' });
      return;
    }

    const payload: AttendanceRequestInput = {
      employeeId: form.employeeId,
      type: form.type,
      date: form.date,
      justificationTypeId: form.justificationTypeId || undefined,
      reason: form.reason,
      autoApprove: reviewer && form.autoApprove && attachments.length === 0,
      punchType: form.type === 'manual_punch' ? form.punchType : undefined,
      punchTime: form.type === 'manual_punch' ? form.punchTime : undefined,
      targetAttendanceRecordId: form.type === 'punch_correction' ? Number(form.targetAttendanceRecordId) : undefined,
      newPunchTime: form.type === 'punch_correction' ? form.newPunchTime : undefined,
    };

    startTransition(() => {
      void createAttendanceRequestAction(payload)
        .then(async (result) => {
          if (result.error) {
            setMessage({ type: 'error', text: humanizeActionError(result.error) });
            return;
          }
          if (result.requestId && attachments.length > 0) {
            const uploaded = await uploadSelectedAttachments(result.requestId, attachments);
            if (!uploaded) return;
            if (reviewer && form.autoApprove) {
              const approveResult = await approveAttendanceRequestAction(result.requestId, 'Aprobación automática al crear.');
              if (approveResult.error) {
                setMessage({ type: 'error', text: humanizeActionError(approveResult.error) });
                return;
              }
            }
          }
          setForm(EMPTY_FORM);
          setAttachments([]);
          setMessage({ type: 'success', text: 'Solicitud creada correctamente.' });
          router.refresh();
        })
        .catch(() => setMessage({ type: 'error', text: humanizeActionError('Failed to fetch') }));
    });
  };

  const uploadSelectedAttachments = async (requestId: string, files: File[]) => {
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const result = await uploadAttendanceRequestAttachmentAction(requestId, formData);
      if (result.error) {
        setMessage({ type: 'error', text: humanizeActionError(result.error) });
        return false;
      }
    }
    router.refresh();
    return true;
  };

  const loadAttachments = (requestId: string) => {
    fetch(`/api/attendance/requests/${requestId}/attachments`)
      .then(async (res) => {
        if (res.ok) return res.json();
        const text = await res.text().catch(() => '');
        throw new Error(text || 'No se pudieron cargar los adjuntos.');
      })
      .then((data: AttendanceRequestAttachment[]) => setAttachmentsByRequest((current) => ({ ...current, [requestId]: data })))
      .catch((error) => setMessage({
        type: 'error',
        text: humanizeActionError(error instanceof Error ? error.message : 'No se pudieron cargar los adjuntos.'),
      }));
  };

  const deleteAttachment = (requestId: string, attachmentId: string) => {
    if (!window.confirm('Vas a eliminar este adjunto de la solicitud. ¿Continuás?')) return;
    startTransition(() => {
      void deleteAttendanceRequestAttachmentAction(requestId, attachmentId)
        .then((result) => {
          if (result.error) {
            setMessage({ type: 'error', text: humanizeActionError(result.error) });
            return;
          }
          loadAttachments(requestId);
          setMessage({ type: 'success', text: 'Adjunto eliminado.' });
          router.refresh();
        });
    });
  };

  const visibleJustificationTypes = justificationTypes.filter((type) => {
    const appliesTo = requestTypeToAppliesTo(form.type);
    return type.appliesTo === appliesTo || type.appliesTo === 'general';
  });

  const review = (id: string, action: 'approve' | 'reject' | 'cancel') => {
    setMessage(null);
    const confirmation =
      action === 'approve'
        ? 'Vas a aprobar esta solicitud. El sistema aplicará el cambio correspondiente y dejará registro de auditoría. ¿Continuás?'
        : action === 'reject'
          ? 'Vas a rechazar esta solicitud. No se aplicarán cambios sobre las fichadas o el resumen del día. ¿Continuás?'
          : 'Vas a cancelar esta solicitud pendiente. No se aplicarán cambios. ¿Continuás?';
    if (!window.confirm(confirmation)) return;
    const notes = reviewNotesById[id] ?? '';
    startTransition(() => {
      const task =
        action === 'approve'
          ? approveAttendanceRequestAction(id, notes)
          : action === 'reject'
            ? rejectAttendanceRequestAction(id, notes)
            : cancelAttendanceRequestAction(id);
      void task
        .then((result) => {
          if (result.error) {
            setMessage({ type: 'error', text: humanizeActionError(result.error) });
            return;
          }
          setMessage({ type: 'success', text: 'Solicitud actualizada.' });
          router.refresh();
        })
        .catch(() => setMessage({ type: 'error', text: humanizeActionError('Failed to fetch') }));
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

      {fromReport && writable && (
        <div className="rounded-lg border px-4 py-3 text-sm" style={{ background: 'var(--blue-soft)', borderColor: 'rgba(59,130,246,0.25)', color: 'var(--blue-text)' }}>
          Solicitud precargada desde reporte. Completá el motivo y confirmá.
        </div>
      )}

      {!writable && (
        <div className="rounded-lg border px-4 py-3 text-sm" style={{ background: 'var(--amber-soft)', borderColor: 'rgba(251,191,36,0.3)', color: 'var(--amber-text)' }}>
          No tenés permisos para realizar esta acción. Podés consultar la información, pero no modificarla.
        </div>
      )}

      {writable && (
        <section className="card rounded-xl">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nueva solicitud</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{TYPE_HELP[form.type]}</p>
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
                {visibleRequestTypes.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de justificación" help={visibleJustificationTypes.length === 0 ? 'No hay tipos de justificación activos.' : 'Elegí una categoría para facilitar el cierre mensual.'}>
              <select name="justificationTypeId" value={form.justificationTypeId} onChange={handleChange} className="input-field w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Sin tipo</option>
                {visibleJustificationTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Fecha">
              <MaskedDateInput value={form.date} onChange={(date) => setForm((current) => ({ ...current, date }))} required className="input-field w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </Field>
            {form.type === 'manual_punch' && (
              <>
                <Field label="Hora fichada">
                  <MaskedDateTimeInput value={form.punchTime} onChange={(punchTime) => setForm((current) => ({ ...current, punchTime }))} required className="input-field w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
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
                <Field
                  label="Fichada a corregir"
                  help="Se completa automáticamente cuando iniciás la corrección desde una fichada. Si lo hacés manualmente, seleccioná o indicá la fichada correspondiente."
                >
                  <input name="targetAttendanceRecordId" value={form.targetAttendanceRecordId} onChange={handleChange} inputMode="numeric" required className="input-field w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </Field>
                <Field label="Nueva hora">
                  <MaskedDateTimeInput value={form.newPunchTime} onChange={(newPunchTime) => setForm((current) => ({ ...current, newPunchTime }))} required className="input-field w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </Field>
              </>
            )}
            <label className="lg:col-span-4 text-sm">
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Motivo</span>
              <textarea name="reason" value={form.reason} onChange={handleChange} required rows={3} className="input-field w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1" />
            </label>
            <Field label="Adjuntar certificado o comprobante" help="Ejemplo: certificado médico, autorización, constancia. PDF, JPG o PNG hasta 5 MB.">
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(event) => setAttachments(Array.from(event.target.files ?? []).slice(0, 5))}
                className="input-field w-full rounded-lg px-3 py-2 text-sm"
              />
            </Field>
            {reviewer && (
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={form.autoApprove} onChange={handleAutoApprove} />
                Aprobar automáticamente
                <span title="Si marcás esta opción, la solicitud queda aprobada al crearla, sin revisión posterior." style={{ color: 'var(--text-muted)' }}>ⓘ</span>
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
                    No hay solicitudes en este momento. Las correcciones y justificaciones aparecerán acá.
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
                    {request.justificationType && <p className="mt-1 text-xs">Tipo: {request.justificationType.name}</p>}
                    {request.attachmentCount > 0 && <p className="mt-1 text-xs">{request.attachmentCount} adjunto(s)</p>}
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
                        <AttachmentsBlock
                          request={request}
                          attachments={attachmentsByRequest[request.id]}
                          onLoad={() => loadAttachments(request.id)}
                          onDelete={(attachmentId) => deleteAttachment(request.id, attachmentId)}
                          canDelete={request.status === 'pending' && (reviewer || request.requestedByUserId === user.id)}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span style={{ color: 'var(--text-muted)' }}>{request.reviewNotes || '-'}</span>
                        <AttachmentsBlock
                          request={request}
                          attachments={attachmentsByRequest[request.id]}
                          onLoad={() => loadAttachments(request.id)}
                          onDelete={(attachmentId) => deleteAttachment(request.id, attachmentId)}
                          canDelete={false}
                        />
                      </div>
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

function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="mt-1">{children}</div>
      {help && <span className="mt-1 block text-xs" style={{ color: 'var(--text-muted)' }}>{help}</span>}
    </label>
  );
}

function AttachmentsBlock({
  request,
  attachments,
  onLoad,
  onDelete,
  canDelete,
}: {
  request: AttendanceRequest;
  attachments?: AttendanceRequestAttachment[];
  onLoad: () => void;
  onDelete: (attachmentId: string) => void;
  canDelete: boolean;
}) {
  if (request.attachmentCount === 0 && !attachments) {
    return <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Esta solicitud no tiene adjuntos.</p>;
  }

  if (!attachments) {
    return (
      <button type="button" onClick={onLoad} className="text-xs font-medium" style={{ color: 'var(--brand-text)' }}>
        Ver adjuntos
      </button>
    );
  }

  if (attachments.length === 0) {
    return <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Esta solicitud no tiene adjuntos.</p>;
  }

  return (
    <div className="space-y-1">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="flex flex-wrap items-center gap-2 text-xs">
          <a
            href={`/api/attendance/requests/${request.id}/attachments/${attachment.id}/download`}
            className="font-medium"
            style={{ color: 'var(--brand-text)' }}
          >
            {attachment.originalName}
          </a>
          <span style={{ color: 'var(--text-muted)' }}>{formatBytes(attachment.sizeBytes)}</span>
          {canDelete && (
            <button type="button" onClick={() => onDelete(attachment.id)} className="font-medium" style={{ color: 'var(--danger-text)' }}>
              Eliminar
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function requestTypeToAppliesTo(type: AttendanceRequestType) {
  switch (type) {
    case 'absence_justification':
      return 'absence';
    case 'late_justification':
      return 'late';
    case 'manual_punch':
      return 'manual_punch';
    case 'punch_correction':
      return 'punch_correction';
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
}
