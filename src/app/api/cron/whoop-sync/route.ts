import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: users } = await supabase
    .from('users')
    .select('id, whoop_access_token, google_health_access_token')
    .or('whoop_access_token.not.is.null,google_health_access_token.not.is.null');

  if (!users?.length) return NextResponse.json({ synced: 0 });

  const results: { userId: string; service: string; status: string }[] = [];

  for (const user of users) {
    if (user.whoop_access_token) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/whoop/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, cronSecret: process.env.CRON_SECRET }),
        });
        const data = await res.json();
        results.push({ userId: user.id, service: 'whoop', status: data.synced ? 'ok' : data.error });
      } catch (e: any) {
        results.push({ userId: user.id, service: 'whoop', status: e.message });
      }
    }
    if (user.google_health_access_token) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/google-health/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, cronSecret: process.env.CRON_SECRET }),
        });
        const data = await res.json();
        results.push({ userId: user.id, service: 'google', status: data.synced ? 'ok' : data.error });
      } catch (e: any) {
        results.push({ userId: user.id, service: 'google', status: e.message });
      }
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
