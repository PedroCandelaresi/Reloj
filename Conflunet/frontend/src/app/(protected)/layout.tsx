import { ReactNode } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Navbar } from '@/components/Navbar';
import { requireCurrentSession } from '@/lib/session';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentSession();

  return (
    <DashboardLayout>
      <Navbar user={user} />
      {children}
    </DashboardLayout>
  );
}
