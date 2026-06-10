import { ProfileManager } from '@/components/ProfileManager';
import { getCurrentUserProfile } from '@/lib/api';

export default async function ProfilePage() {
  const profile = await getCurrentUserProfile();

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 py-8 pt-32">
        <ProfileManager profile={profile} />
      </main>
    </>
  );
}
