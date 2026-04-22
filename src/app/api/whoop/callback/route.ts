import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { exchangeCode, getWhoopProfile } from '@/lib/whoop';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const settingsUrl = new URL('/settings', process.env.NEXT_PUBLIC_APP_URL!);

  if (error || !code) {
    settingsUrl.searchParams.set('whoop', 'error');
    return NextResponse.redirect(settingsUrl.toString());
  }

  // Validate CSRF state
  const savedState = request.cookies.get('whoop_oauth_state')?.value;
  if (!savedState || savedState !== state) {
    settingsUrl.searchParams.set('whoop', 'error');
    return NextResponse.redirect(settingsUrl.toString());
  }

  // Get authenticated user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!));

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/whoop/callback`;
    const tokens = await exchangeCode(code, redirectUri);
    const profile = await getWhoopProfile(tokens.access_token);

    const service = createServiceClient();
    await service.from('users').update({
      whoop_access_token: tokens.access_token,
      whoop_refresh_token: tokens.refresh_token,
      whoop_user_id: String(profile.user_id),
      whoop_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      whoop_connected_at: new Date().toISOString(),
    }).eq('id', user.id);

    settingsUrl.searchParams.set('whoop', 'connected');
  } catch (e: any) {
    console.error('WHOOP OAuth callback error:', e);
    settingsUrl.searchParams.set('whoop', 'error');
  }

  const response = NextResponse.redirect(settingsUrl.toString());
  response.cookies.delete('whoop_oauth_state');
  return response;
}
