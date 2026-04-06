import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// GET /api/public-challenges?code=ABC123 or ?id=uuid or ?user_id=uuid
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const id = searchParams.get('id');
  const userId = searchParams.get('user_id');
  const supabase = await createClient();

  if (code) {
    const { data, error } = await supabase
      .from('public_challenges')
      .select('*, public_challenge_participants(*)')
      .eq('invite_code', code)
      .single();
    if (error) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    return NextResponse.json({ challenge: data });
  }

  if (id) {
    const { data, error } = await supabase
      .from('public_challenges')
      .select('*, public_challenge_participants(*)')
      .eq('id', id)
      .single();
    if (error) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    return NextResponse.json({ challenge: data });
  }

  if (userId) {
    // Get all challenges this user participates in
    const { data: participations } = await supabase
      .from('public_challenge_participants')
      .select('challenge_id')
      .eq('user_id', userId);

    const challengeIds = participations?.map(p => p.challenge_id) || [];
    if (!challengeIds.length) return NextResponse.json({ challenges: [] });

    const { data } = await supabase
      .from('public_challenges')
      .select('*, public_challenge_participants(*)')
      .in('id', challengeIds)
      .order('created_at', { ascending: false });

    return NextResponse.json({ challenges: data || [] });
  }

  return NextResponse.json({ error: 'Provide code, id, or user_id' }, { status: 400 });
}

// POST /api/public-challenges — create or join
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;
  const supabase = await createClient();

  if (action === 'create') {
    const { creator_id, name, description, metric, metric_config, target, start_date, end_date } = body;
    const invite_code = generateCode();

    const { data, error } = await supabase
      .from('public_challenges')
      .insert({ creator_id, name, description, invite_code, metric, metric_config, target, start_date, end_date })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Auto-join creator
    await supabase
      .from('public_challenge_participants')
      .insert({ challenge_id: data.id, user_id: creator_id, display_name: body.display_name });

    return NextResponse.json({ challenge: data });
  }

  if (action === 'join') {
    const { invite_code, user_id, display_name } = body;

    const { data: challenge } = await supabase
      .from('public_challenges')
      .select('id, status')
      .eq('invite_code', invite_code)
      .single();

    if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    if (challenge.status !== 'active') return NextResponse.json({ error: 'Challenge is no longer active' }, { status: 400 });

    const { error } = await supabase
      .from('public_challenge_participants')
      .upsert({ challenge_id: challenge.id, user_id, display_name }, { onConflict: 'challenge_id,user_id' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, challenge_id: challenge.id });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
