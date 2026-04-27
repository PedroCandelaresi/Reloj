import { Navbar } from '@/components/Navbar';
import { ChangePasswordManager } from '@/components/ChangePasswordManager';
import { requireCurrentSession } from '@/lib/session';

export default async function ChangePasswordPage() {
  const user = await requireCurrentSession();

  return (
    <>
      <Navbar user={user} />
      <main className="max-w-5xl mx-auto px-4 py-8 pt-32">
        <ChangePasswordManager />
      </main>
    </>
  );
}
