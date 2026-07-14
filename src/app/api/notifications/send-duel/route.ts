import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { sendNotification } from '@/services/notifications';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { opponentId, duelType, duelId } = await request.json();
  if (!opponentId || !duelId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Get challenger's display name
  const serviceSupabase = createServiceClient();
  const { data: challenger } = await serviceSupabase
    .from('users')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const challengerName = challenger?.display_name || 'Someone';

  const result = await sendNotification({
    userId: opponentId,
    category: 'duel_received',
    variables: {
      challenger_name: challengerName,
      metric: duelType === 'xp' ? 'XP' : duelType,
    },
    deepLink: `/arena?duel=${duelId}`,
    priority: 5,
  });

  return NextResponse.json(result);
}
