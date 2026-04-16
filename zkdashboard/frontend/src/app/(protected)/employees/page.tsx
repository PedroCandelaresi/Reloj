import { Navbar } from '@/components/Navbar';
import { EmployeesManager } from '@/components/EmployeesManager';
import { getEmployees } from '@/lib/api';

export default async function EmployeesPage() {
  const employees = await getEmployees();

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 pt-32">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white drop-shadow-md">Empleados</h1>
          <p className="text-emerald-200/70 text-sm mt-1">
            Administrá la maestra usada para enriquecer los registros de asistencia.
          </p>
        </div>

        <EmployeesManager employees={employees} />
      </main>
    </>
  );
}