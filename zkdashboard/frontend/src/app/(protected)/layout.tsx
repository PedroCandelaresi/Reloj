import { ReactNode } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { requireCurrentSession } from '@/lib/session';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireCurrentSession();

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}
