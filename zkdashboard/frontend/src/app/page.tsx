import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwtPayload, getDefaultAppPath } from '@/lib/auth-token';
import Link from 'next/link';
import Image from 'next/image';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (token) {
    redirect(getDefaultAppPath(decodeJwtPayload(token)));
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 flex flex-col font-sans selection:bg-blue-500/30">
      {/* Elementos decorativos de fondo (Gradients sutiles) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none flex justify-center items-center">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-900/20 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      {/* Topbar Glassmorphism */}
      <header className="w-full fixed top-0 z-50 backdrop-blur-xl bg-[#050505]/60 border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center transition-all duration-300">
        <div className="flex items-center gap-3">
          {/* Logo Wordmark */}
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image 
              src="/brand/conflunet-wordmark-brushed-steel.svg" 
              alt="Conflunet" 
              width={160} 
              height={40} 
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>
        </div>
        <Link 
          href="/login" 
          className="px-6 py-2.5 text-sm font-medium bg-white/5 border border-white/10 text-slate-300 rounded-full hover:bg-white/10 hover:text-white transition-all duration-300 backdrop-blur-md shadow-sm"
        >
          Iniciar sesión
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 mt-20 z-10 text-center">
        
        {/* Isotipo central con glow animado */}
        <div className="mb-10 relative group">
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150 transition-transform duration-700 group-hover:scale-175 opacity-50 group-hover:opacity-100"></div>
          <Image 
            src="/brand/conflunet-isotipo.svg" 
            alt="Conflunet Isotipo" 
            width={120} 
            height={120} 
            className="h-28 w-auto relative z-10 drop-shadow-2xl transition-transform duration-700 hover:scale-110"
            priority
          />
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-5xl text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
          La evolución de tu gestión,<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-500">
            con estilo.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed font-light">
          Descubre una plataforma diseñada para centralizar tus operaciones con un rendimiento impecable y una interfaz inigualable.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-5">
          <Link 
            href="/login" 
            className="group relative px-8 py-4 text-base font-semibold bg-white text-black rounded-full overflow-hidden transition-transform duration-300 hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.4)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-slate-200 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative flex items-center gap-2">
              Ingresar al Sistema
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </Link>
          <Link 
            href="/login" 
            className="px-8 py-4 text-base font-medium text-slate-300 border border-slate-800 rounded-full hover:bg-slate-800/50 hover:text-white transition-all hover:border-slate-600"
          >
            Explorar características
          </Link>
        </div>
      </main>
      
      {/* Footer minimalista */}
      <footer className="py-8 text-center text-slate-500 text-sm z-10 border-t border-white/5 bg-[#050505]/50 backdrop-blur-sm">
        <p className="mb-2 tracking-wide text-slate-400 uppercase text-xs font-semibold">Conflunet</p>
        <p>&copy; {new Date().getFullYear()} Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
