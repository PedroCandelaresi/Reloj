import { getCurrentUserProfile } from '@/lib/api';
import { NavbarClient } from './NavbarClient';
import type { CurrentUserProfile } from '@/lib/api';

export async function Navbar({
  user: providedUser,
}: {
  user?: CurrentUserProfile | null;
} = {}) {
  let user = providedUser ?? null;

  if (!user) {
    try {
      user = await getCurrentUserProfile();
    } catch {
      user = null;
    }
  }

  return <NavbarClient user={user} />;
}
