import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwtPayload, getDefaultAppPath } from '@/lib/auth-token';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/login');
  }

  redirect(getDefaultAppPath(decodeJwtPayload(token)));
}
