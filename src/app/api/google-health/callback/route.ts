import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { exchangeCode } from '@/lib/google-health';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const settingsUrl = new URL('/settings', process.env.NEXT_PUBLIC_APP_URL!);

  if (error || !code) {
    settingsUrl.searchParams.set('google', 'error');
    return NextResponse.redirect(settingsUrl.toString());
  }

  const savedState = request.cookies.get('google_health_state')?.value;
  if (!savedState || savedState !== state) {
    settingsUrl.searchParams.set('google', 'error');
    return NextResponse.redirect(settingsUrl.toString());
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!));

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/google-health/callback`;
    const tokens = await exchangeCode(code, redirectUri);

    const service = createServiceClient();
    await service.from('users').update({
      google_health_access_token: tokens.access_token,
      google_health_refresh_token: tokens.refresh_token,
      google_health_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      google_health_connected_at: new Date().toISOString(),
    }).eq('id', user.id);

    settingsUrl.searchParams.set('google', 'connected');
  } catch (e: any) {
    console.error('Google Health callback error:', e);
    settingsUrl.searchParams.set('google', 'error');
  }

  const response = NextResponse.redirect(settingsUrl.toString());
  response.cookies.delete('google_health_state');
  return response;
}
