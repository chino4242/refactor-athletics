import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toLocaleDateString('en-CA');
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const weekStart = getWeekStart();

  // Check if slate already exists for this week
  const { data: existing } = await service.from('quest_slate')
    .select('id').eq('user_id', user.id).eq('week_start', weekStart).limit(1);
  if (existing?.length) {
    return NextResponse.json({ message: 'Slate already generated', week: weekStart });
  }

  // Get user's trailing data for scaling
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const cutoff = Math.floor(fourWeeksAgo.getTime() / 1000);

  const [{ data: workouts }, { data: habits }] = await Promise.all([
    service.from('workouts').select('xp, raw_value, date').eq('user_id', user.id).gte('timestamp', cutoff),
    service.from('habit_logs').select('habit_id, value, date').eq('user_id', user.id).gte('timestamp', cutoff),
  ]);

  // Calculate averages
  const weeklyWorkouts = (workouts?.length || 0) / 4;
  const totalVolume = (workouts || []).reduce((s, w) => s + (w.raw_value || 0), 0) / 4;
  const weeklySteps = (habits || []).filter(h => h.habit_id === 'habit_steps').reduce((s, h) => s + (h.value || 0), 0) / 4;

  // Get all templates (individual)
  const { data: templates } = await service.from('quest_templates')
    .select('*').eq('is_party', false);
  if (!templates?.length) return NextResponse.json({ error: 'No templates' }, { status: 500 });

  // Pick 5 varied quests (1 per category if possible)
  const categories = ['strength', 'cardio', 'nutrition', 'recovery', 'hybrid'];
  const selected: any[] = [];
  const shuffled = [...templates].sort(() => Math.random() - 0.5);

  for (const cat of categories) {
    const match = shuffled.find(t => t.category === cat && !selected.includes(t));
    if (match) selected.push(match);
  }

  // Scale targets based on user data
  const slate = selected.map(template => {
    let target = Number(template.base_target);
    if (template.scaling_type === 'average') {
      if (template.metric === 'total_volume' && totalVolume > 0) target = Math.round(totalVolume * 1.1 / 100) * 100;
      if (template.metric === 'workout_count' && weeklyWorkouts > 0) target = Math.max(3, Math.round(weeklyWorkouts));
      if (template.metric === 'weekly_steps' && weeklySteps > 0) target = Math.round(weeklySteps * 1.05 / 1000) * 1000;
    }
    return {
      user_id: user.id,
      quest_template_id: template.id,
      week_start: weekStart,
      target_value: target,
      status: 'offered',
    };
  });

  // Generate 1 party quest if user is in a party
  const { data: membership } = await service.from('group_members').select('group_id').eq('user_id', user.id).limit(1).single();
  if (membership) {
    const { data: members } = await service.from('group_members').select('user_id').eq('group_id', membership.group_id);
    const partySize = members?.length || 1;

    const { data: partyTemplates } = await service.from('quest_templates').select('*').eq('is_party', true);
    if (partyTemplates?.length) {
      const partyQuest = partyTemplates[Math.floor(Math.random() * partyTemplates.length)];
      // Scale target by party size (base assumes 5 people)
      const scaledTarget = Math.round((Number(partyQuest.base_target) / 5) * partySize);
      slate.push({
        user_id: user.id,
        quest_template_id: partyQuest.id,
        week_start: weekStart,
        target_value: scaledTarget,
        status: 'offered',
      });
    }
  }

  // Insert slate
  await service.from('quest_slate').insert(slate);

  return NextResponse.json({ success: true, week: weekStart, quests: slate.length });
}

// GET: fetch current week's slate
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const weekStart = getWeekStart();

  const { data: slate } = await service.from('quest_slate')
    .select('*, quest_templates(*)')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .order('created_at');

  return NextResponse.json({ quests: slate || [], week: weekStart });
}
