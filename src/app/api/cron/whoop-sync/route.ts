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
    .select('id')
    .not('whoop_access_token', 'is', null);

  if (!users?.length) return NextResponse.json({ synced: 0 });

  const results: { userId: string; status: string }[] = [];

  for (const user of users) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/whoop/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, cronSecret: process.env.CRON_SECRET }),
      });
      const data = await res.json();
      results.push({ userId: user.id, status: data.synced ? 'ok' : data.error });
    } catch (e: any) {
      results.push({ userId: user.id, status: e.message });
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
