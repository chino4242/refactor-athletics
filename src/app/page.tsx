import TrackPage from '@/components/TrackPage';
import { createClient } from '@/utils/supabase/server';
import { getProfile, getUserStats } from '@/services/api';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Fetch all required data on the Server
  const profile = await getProfile(user.id);
  const stats = await getUserStats(user.id);

  const bodyweight = profile?.bodyweight || 180;

  return (
    <div className="min-h-screen bg-black text-white w-full">
      <main className="w-full h-full">
        <TrackPage
          userId={user.id}
          bodyweight={bodyweight}
          initialProfile={profile}
          initialStats={stats}
        />
      </main>
    </div>
  );
}
