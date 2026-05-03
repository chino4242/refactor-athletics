import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { randomBytes } from 'crypto';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL));

  const state = randomBytes(8).toString('hex');
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/whoop/callback`;

  const scopes = ['read:recovery', 'read:cycles', 'read:sleep', 'read:profile', 'read:body_measurement'];

  const url = new URL('https://api.prod.whoop.com/oauth/oauth2/auth');
  url.searchParams.set('client_id', process.env.WHOOP_CLIENT_ID!);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('state', state);

  const isLocal = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost');
  const response = NextResponse.redirect(url.toString());
  response.cookies.set('whoop_oauth_state', state, {
    httpOnly: true,
    secure: !isLocal,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
