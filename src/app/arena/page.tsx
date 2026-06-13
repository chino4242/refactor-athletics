import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ArenaScreen from '@/components/v2/ArenaScreen';

export default async function ArenaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  return <ArenaScreen userId={user.id} />;
}
