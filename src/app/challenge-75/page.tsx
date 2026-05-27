import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Challenge75Client from '@/components/challenges/Challenge75Client';

export default async function Challenge75Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: groups } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name)')
    .eq('user_id', user.id);

  return <Challenge75Client userId={user.id} groups={(groups || []).map(g => g.groups).filter(Boolean)} />;
}
