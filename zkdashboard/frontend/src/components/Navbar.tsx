import Image from 'next/image';
import Link from 'next/link';
import { logout } from '@/lib/actions';

export function Navbar({ username }: { username?: string }) {
  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image
            src="/brand/icon-512.png"
            alt="STARNET"
            width={32}
            height={32}
            className="h-8 w-8 rounded-md object-contain"
            priority
          />
          <span className="font-bold text-lg tracking-tight">STARNET</span>
        </Link>
        <Link href="/dashboard" className="text-gray-300 hover:text-white text-sm transition-colors">
          Inicio
        </Link>
        <Link href="/employees" className="text-gray-300 hover:text-white text-sm transition-colors">
          Empleados
        </Link>
        <Link href="/records" className="text-gray-300 hover:text-white text-sm transition-colors">
          Registros
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {username && <span className="text-gray-400 text-sm">{username}</span>}
        <form action={logout}>
          <button
            type="submit"
            className="text-red-400 hover:text-red-300 text-sm transition-colors"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </nav>
  );
}
