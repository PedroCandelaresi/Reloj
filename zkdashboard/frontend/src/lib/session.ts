import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile, type CurrentUserProfile } from './api';
import { decodeJwtPayload, getDefaultAppPath } from './auth-token';

export async function getCurrentSession(): Promise<CurrentUserProfile | null> {
  try {
    return await getCurrentUserProfile();
  } catch {
    return null;
  }
}

export async function requireCurrentSession(): Promise<CurrentUserProfile> {
  const session = await getCurrentSession();
  if (!session) {
    redirect('/login');
  }

  return session;
}

export async function requireSuperAdminSession(): Promise<CurrentUserProfile> {
  const session = await requireCurrentSession();
  if (!session.isSuperAdmin) {
    redirect('/dashboard');
  }

  return session;
}

export async function getDefaultPathFromCookies(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  return getDefaultAppPath(decodeJwtPayload(token));
}
