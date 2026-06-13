import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ActiveWorkoutPage from './ActiveWorkoutPage';

export default async function TrainActivePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('bodyweight, sex, age')
    .eq('id', user.id)
    .single();

  return (
    <ActiveWorkoutPage
      userId={user.id}
      bodyweight={profile?.bodyweight || 180}
      sex={profile?.sex || 'male'}
      age={profile?.age || 25}
    />
  );
}
