import { Navbar } from '@/components/Navbar';
import { ChangePasswordManager } from '@/components/ChangePasswordManager';

export default function ChangePasswordPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8 pt-32">
        <ChangePasswordManager />
      </main>
    </>
  );
}
