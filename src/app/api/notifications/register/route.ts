import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { platform, push_token } = body;

  // Validate platform
  if (platform !== 'ios' && platform !== 'android') {
    return NextResponse.json(
      { error: 'Invalid platform. Must be "ios" or "android".' },
      { status: 400 }
    );
  }

  // Validate push_token
  if (!push_token || typeof push_token !== 'string' || push_token.trim() === '') {
    return NextResponse.json(
      { error: 'push_token is required and must be a non-empty string.' },
      { status: 400 }
    );
  }

  // Upsert into user_devices table
  const { error: deviceError } = await supabase
    .from('user_devices')
    .upsert(
      {
        user_id: user.id,
        platform,
        push_token,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' }
    );

  if (deviceError) {
    return NextResponse.json({ error: deviceError.message }, { status: 500 });
  }

  // Update legacy push_token on users table for backward compatibility
  const { error: userError } = await supabase
    .from('users')
    .update({ push_token, push_platform: platform })
    .eq('id', user.id);

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
