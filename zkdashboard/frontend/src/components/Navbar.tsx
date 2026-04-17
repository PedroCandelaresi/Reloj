import { getCurrentUserProfile } from '@/lib/api';
import { NavbarClient } from './NavbarClient';

export async function Navbar() {
  let user = null;

  try {
    user = await getCurrentUserProfile();
  } catch {
    user = null;
  }

  return <NavbarClient user={user} />;
}
