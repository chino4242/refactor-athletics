import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import PowerLevelScreen from '@/components/v2/PowerLevelScreen';
import OnboardingFlow from '@/components/v2/OnboardingFlow';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('is_onboarded, waiver_accepted_at')
    .eq('id', user.id)
    .single();

  if (!profile?.is_onboarded) {
    return <OnboardingFlow userId={user.id} />;
  }

  return <PowerLevelScreen userId={user.id} />;
}
