import { createServiceClient } from '@/utils/supabase/service';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const HEALTH_API = 'https://health.googleapis.com/v4';

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env.GOOGLE_HEALTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_HEALTH_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  return res.json();
}

async function refreshTokens(refreshToken: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_HEALTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_HEALTH_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);
  return res.json();
}

export async function getValidToken(userId: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from('users')
    .select('google_health_access_token, google_health_refresh_token, google_health_token_expires_at')
    .eq('id', userId)
    .single();

  if (!user?.google_health_access_token) return null;

  const expiresAt = new Date(user.google_health_token_expires_at).getTime();
  if (Date.now() < expiresAt - 60000) return user.google_health_access_token;

  try {
    const tokens = await refreshTokens(user.google_health_refresh_token);
    await supabase.from('users').update({
      google_health_access_token: tokens.access_token,
      ...(tokens.refresh_token && { google_health_refresh_token: tokens.refresh_token }),
      google_health_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    }).eq('id', userId);
    return tokens.access_token;
  } catch {
    await supabase.from('users').update({
      google_health_access_token: null,
      google_health_refresh_token: null,
      google_health_token_expires_at: null,
    }).eq('id', userId);
    return null;
  }
}

async function healthGet(token: string, path: string) {
  const res = await fetch(`${HEALTH_API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Google Health API ${path}: ${res.status}`);
  return res.json();
}

async function healthPost(token: string, path: string, body: any) {
  const res = await fetch(`${HEALTH_API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google Health API ${path}: ${res.status}`);
  return res.json();
}

// Get today's total steps via dailyRollUp
export async function getTodaySteps(token: string, date: Date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const data = await healthPost(token, '/users/me/dataTypes/steps/dataPoints:dailyRollUp', {
    range: {
      start: { date: { year: y, month: m, day: d }, time: { hours: 0 } },
      end: { date: { year: y, month: m, day: d }, time: { hours: 23, minutes: 59, seconds: 59 } },
    },
    windowSizeDays: 1,
  });
  const count = data.rollupDataPoints?.[0]?.steps?.countSum;
  return count ? parseInt(count) : null;
}

// Get today's total calories via dailyRollUp
export async function getTodayCalories(token: string, date: Date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const data = await healthPost(token, '/users/me/dataTypes/total-calories/dataPoints:dailyRollUp', {
    range: {
      start: { date: { year: y, month: m, day: d }, time: { hours: 0 } },
      end: { date: { year: y, month: m, day: d }, time: { hours: 23, minutes: 59, seconds: 59 } },
    },
    windowSizeDays: 1,
  });
  const cal = data.rollupDataPoints?.[0]?.totalCalories?.caloriesSum;
  return cal ? Math.round(parseFloat(cal)) : null;
}

// Get last night's sleep
export async function getLatestSleep(token: string, date: Date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const filterDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const data = await healthGet(token,
    `/users/me/dataTypes/sleep/dataPoints?filter=sleep.interval.civil_end_time >= "${filterDate}T00:00:00"&page_size=1`
  );
  const sleep = data.dataPoints?.[0];
  if (!sleep?.sleep?.summary?.minutesAsleep) return null;
  return Math.round(parseInt(sleep.sleep.summary.minutesAsleep) / 60 * 10) / 10;
}

// Get latest weight
export async function getLatestWeight(token: string) {
  const data = await healthGet(token, '/users/me/dataTypes/weight/dataPoints?page_size=1');
  const point = data.dataPoints?.[0];
  if (!point?.weight?.kilograms) return null;
  return Math.round(parseFloat(point.weight.kilograms) * 2.20462 * 10) / 10; // kg → lbs
}
