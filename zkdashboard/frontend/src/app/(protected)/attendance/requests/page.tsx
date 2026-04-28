import { AttendanceRequestsManager } from '@/components/AttendanceRequestsManager';
import { Navbar } from '@/components/Navbar';
import {
  getAttendanceAuditLog,
  getAttendanceRequests,
  getDistinctUsers,
  type AttendanceRequestStatus,
  type AttendanceRequestType,
} from '@/lib/api';
import { todayArgentinaDateKey } from '@/lib/argentina-date';
import { requireCurrentSession } from '@/lib/session';

interface PageProps {
  searchParams: Promise<{
    status?: AttendanceRequestStatus;
    type?: AttendanceRequestType;
    employeeId?: string;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    punchTime?: string;
    punchType?: string;
    targetAttendanceRecordId?: string;
    newPunchTime?: string;
    fromReport?: string;
  }>;
}

export default async function AttendanceRequestsPage({ searchParams }: PageProps) {
  const user = await requireCurrentSession();
  const sp = await searchParams;
  const today = todayArgentinaDateKey();
  const params = {
    status: sp.status || undefined,
    type: sp.type || undefined,
    employeeId: sp.employeeId || undefined,
    dateFrom: sp.dateFrom || today,
    dateTo: sp.dateTo || today,
  };
  const [requests, auditLogs, userOptions] = await Promise.all([
    getAttendanceRequests(params),
    getAttendanceAuditLog({ dateFrom: params.dateFrom, dateTo: params.dateTo, employeeId: params.employeeId }),
    getDistinctUsers(),
  ]);

  return (
    <>
      <Navbar user={user} />
      <main className="mx-auto max-w-7xl px-4 py-8 pt-32">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Solicitudes de asistencia
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Fichadas manuales, correcciones y justificaciones con auditoría.
          </p>
        </div>

        <form action="/attendance/requests" className="card mb-6 grid grid-cols-1 gap-4 p-5 md:grid-cols-5">
          <label className="text-sm">
            <span className="mb-1 block font-medium" style={{ color: 'var(--text-secondary)' }}>Desde</span>
            <input type="date" name="dateFrom" defaultValue={params.dateFrom} className="input-field w-full rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium" style={{ color: 'var(--text-secondary)' }}>Hasta</span>
            <input type="date" name="dateTo" defaultValue={params.dateTo} className="input-field w-full rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium" style={{ color: 'var(--text-secondary)' }}>Estado</span>
            <select name="status" defaultValue={params.status ?? ''} className="input-field w-full rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobada</option>
              <option value="rejected">Rechazada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium" style={{ color: 'var(--text-secondary)' }}>Tipo</span>
            <select name="type" defaultValue={params.type ?? ''} className="input-field w-full rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              <option value="manual_punch">Fichada manual</option>
              <option value="punch_correction">Corrección</option>
              <option value="absence_justification">Ausencia</option>
              <option value="late_justification">Tardanza</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium" style={{ color: 'var(--text-secondary)' }}>Empleado</span>
            <select name="employeeId" defaultValue={params.employeeId ?? ''} className="input-field w-full rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              {userOptions.map((option) => (
                <option key={option.userId} value={option.userId}>
                  {option.employee ? `${option.employee.apellido}, ${option.employee.nombre}` : option.userId}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-5 flex justify-end">
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Filtrar
            </button>
          </div>
        </form>

        <AttendanceRequestsManager
          requests={requests}
          auditLogs={auditLogs}
          userOptions={userOptions}
          user={user}
          initialForm={{
            employeeId: sp.employeeId ?? '',
            type: sp.type ?? 'manual_punch',
            date: sp.date ?? sp.dateFrom ?? '',
            punchTime: sp.punchTime ?? '',
            punchType: sp.punchType === 'in' || sp.punchType === 'out' || sp.punchType === 'unknown' ? sp.punchType : 'unknown',
            targetAttendanceRecordId: sp.targetAttendanceRecordId ?? '',
            newPunchTime: sp.newPunchTime ?? '',
            reason: '',
            autoApprove: false,
          }}
          fromReport={sp.fromReport === '1'}
        />
      </main>
    </>
  );
}
