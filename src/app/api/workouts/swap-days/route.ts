import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { day1, day2 } = await request.json();
    if (!day1 || !day2) return NextResponse.json({ error: 'Missing days' }, { status: 400 });

    // Get programs assigned to these days
    const { data: programs } = await supabase
        .from('workout_programs')
        .select('id, day_of_week')
        .eq('user_id', user.id)
        .in('day_of_week', [day1, day2]);

    if (!programs || programs.length === 0) {
        return NextResponse.json({ error: 'No programs found for these days' }, { status: 404 });
    }

    // Swap day_of_week values
    const day1Programs = programs.filter(p => p.day_of_week === day1);
    const day2Programs = programs.filter(p => p.day_of_week === day2);

    const updates = [
        ...day1Programs.map(p => supabase.from('workout_programs').update({ day_of_week: day2 }).eq('id', p.id)),
        ...day2Programs.map(p => supabase.from('workout_programs').update({ day_of_week: day1 }).eq('id', p.id)),
    ];

    await Promise.all(updates);

    return NextResponse.json({ success: true });
}
