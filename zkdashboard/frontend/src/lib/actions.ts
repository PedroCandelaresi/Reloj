'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API = process.env.API_URL || 'http://localhost:4201';

export async function login(_: unknown, formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  let res: Response;
  try {
    res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    return { error: 'No se pudo conectar al servidor' };
  }

  if (!res.ok) {
    return { error: 'Usuario o contraseña incorrectos' };
  }

  const { access_token } = await res.json();
  const cookieStore = await cookies();
  cookieStore.set('token', access_token, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });

  redirect('/dashboard');
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
  redirect('/login');
}
