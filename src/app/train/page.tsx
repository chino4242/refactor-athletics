import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import TrainScreen from '@/components/v2/TrainScreen';

export default async function TrainPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  return <TrainScreen userId={user.id} />;
}
