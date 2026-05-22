import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { quest_id, action } = await request.json();
  const service = createServiceClient();

  if (action === 'accept') {
    await service.from('quest_slate').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', quest_id).eq('user_id', user.id);
  } else if (action === 'decline') {
    await service.from('quest_slate').update({ status: 'expired' }).eq('id', quest_id).eq('user_id', user.id);
  }

  return NextResponse.json({ success: true });
}
