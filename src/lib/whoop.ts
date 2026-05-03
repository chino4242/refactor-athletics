import { createServiceClient } from '@/utils/supabase/service';

const WHOOP_API = 'https://api.prod.whoop.com';
const TOKEN_URL = `${WHOOP_API}/oauth/oauth2/token`;

export interface WhoopTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// Exchange authorization code for tokens
export async function exchangeCode(code: string, redirectUri: string): Promise<WhoopTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

// Refresh an expired access token
export async function refreshTokens(refreshToken: string): Promise<WhoopTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  return res.json();
}

// Get a valid access token for a user, refreshing if needed
export async function getValidToken(userId: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from('users')
    .select('whoop_access_token, whoop_refresh_token, whoop_token_expires_at')
    .eq('id', userId)
    .single();

  if (!user?.whoop_access_token) return null;

  const expiresAt = new Date(user.whoop_token_expires_at).getTime();
  if (Date.now() < expiresAt - 60000) return user.whoop_access_token;

  // Token expired or about to — refresh
  try {
    const tokens = await refreshTokens(user.whoop_refresh_token);
    await supabase.from('users').update({
      whoop_access_token: tokens.access_token,
      whoop_refresh_token: tokens.refresh_token,
      whoop_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    }).eq('id', userId);
    return tokens.access_token;
  } catch {
    // Refresh failed — token revoked
    await supabase.from('users').update({
      whoop_access_token: null,
      whoop_refresh_token: null,
      whoop_token_expires_at: null,
    }).eq('id', userId);
    return null;
  }
}

// Fetch from WHOOP API with auth
async function whoopGet(token: string, path: string, params?: Record<string, string>) {
  const url = new URL(`${WHOOP_API}/developer${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`WHOOP API ${path}: ${res.status}`);
  return res.json();
}

// Get today's cycle (strain, calories)
export async function getTodayCycle(token: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const data = await whoopGet(token, '/v2/cycle', {
    start: start.toISOString(),
    limit: '1',
  });
  return data.records?.[0] || null;
}

// Get latest recovery (recovery score, HRV, resting HR)
export async function getLatestRecovery(token: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const data = await whoopGet(token, '/v2/recovery', {
    start: start.toISOString(),
    limit: '1',
  });
  return data.records?.[0] || null;
}

// Get latest sleep
export async function getLatestSleep(token: string) {
  const start = new Date();
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);
  const data = await whoopGet(token, '/v2/activity/sleep', {
    start: start.toISOString(),
    limit: '1',
  });
  const sleep = data.records?.[0];
  if (!sleep || sleep.nap || sleep.score_state !== 'SCORED') return null;
  return sleep;
}

// Get WHOOP user profile
export async function getWhoopProfile(token: string) {
  return whoopGet(token, '/v2/user/profile/basic');
}

// Get body measurements (weight)
export async function getBodyMeasurement(token: string) {
  return whoopGet(token, '/v2/user/measurement/body');
}
