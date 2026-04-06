import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase
    .from('screenshot_examples')
    .select('image_description, corrected_json')
    .eq('screenshot_type', type)
    .order('created_at', { ascending: false })
    .limit(3);

  return NextResponse.json({ examples: data || [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { user_id, screenshot_type, image_description, corrected_json } = body;

  if (!user_id || !screenshot_type || !image_description || !corrected_json) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('screenshot_examples')
    .insert({ user_id, screenshot_type, image_description, corrected_json });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
