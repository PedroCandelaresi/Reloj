import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwtPayload, getDefaultAppPath } from '@/lib/auth-token';
import Link from 'next/link';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (token) {
    redirect(getDefaultAppPath(decodeJwtPayload(token)));
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Topbar */}
      <header className="w-full bg-white shadow-sm py-4 px-6 md:px-12 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          {/* Opcional: Logo 3D o imagen aquí */}
          <span className="text-2xl font-bold text-blue-700 tracking-tight">Conflunet</span>
        </div>
        <Link 
          href="/login" 
          className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          Iniciar sesión
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-gray-50 to-white -z-10"></div>
        
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6 max-w-4xl">
          El futuro de tu gestión con <span className="text-blue-600 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Conflunet</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mb-10 leading-relaxed">
          Centraliza tus operaciones, optimiza tu tiempo y lleva el control al siguiente nivel en una plataforma rápida y segura.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/login" 
            className="px-8 py-4 text-base font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            Ingresar al Sistema
          </Link>
        </div>
      </main>
      
      {/* Footer simple */}
      <footer className="py-6 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Conflunet. Todos los derechos reservados.
      </footer>
    </div>
  );
}
