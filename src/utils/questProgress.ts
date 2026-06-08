/** Check and update quest progress after any data write */
export async function checkQuestProgress(supabase: any, userId: string) {
  try {
    // Get this week's accepted quests
    const now = new Date();
    const day = now.getDay();
    const diff = (day + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    const weekStart = monday.toLocaleDateString('en-CA');

    const { data: quests } = await supabase.from('quest_slate')
      .select('id, quest_template_id, target_value, current_value, status, quest_templates(metric)')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .eq('status', 'accepted');

    if (!quests?.length) return;

    // Get this week's data
    const weekStartTs = Math.floor(monday.getTime() / 1000);
    const [{ data: workouts }, { data: habits }] = await Promise.all([
      supabase.from('workouts').select('xp, raw_value, date, level, sets').eq('user_id', userId).gte('timestamp', weekStartTs),
      supabase.from('habit_logs').select('habit_id, value, date').eq('user_id', userId).gte('timestamp', weekStartTs),
    ]);

    // Calculate metrics
    const metrics: Record<string, number> = {};
    metrics.workout_count = new Set((workouts || []).map((w: any) => w.date)).size;
    // Total volume = sum of (weight × reps) across all sets
    metrics.total_volume = (workouts || []).reduce((s: number, w: any) => {
      if (!w.sets || !Array.isArray(w.sets)) return s;
      return s + w.sets.reduce((ss: number, set: any) => ss + ((set.weight || 0) * (set.reps || 0)), 0);
    }, 0);
    metrics.rank_up = (workouts || []).filter((w: any) => w.level > 0).length > 0 ? 1 : 0;
    metrics.weekly_steps = (habits || []).filter((h: any) => h.habit_id === 'habit_steps').reduce((s: number, h: any) => s + (h.value || 0), 0);

    // Days-based metrics
    const sleepDays = new Set((habits || []).filter((h: any) => h.habit_id === 'habit_sleep' && h.value >= 7).map((h: any) => h.date)).size;
    metrics.sleep_days = sleepDays;

    const proteinDays = new Set((habits || []).filter((h: any) => h.habit_id === 'macro_protein' && h.value >= 100).map((h: any) => h.date)).size;
    metrics.protein_days = proteinDays;

    const waterDays = new Set((habits || []).filter((h: any) => h.habit_id === 'habit_water' && h.value >= 64).map((h: any) => h.date)).size;
    metrics.water_days = waterDays;

    const activeDays = new Set([...(workouts || []).map((w: any) => w.date), ...(habits || []).filter((h: any) => h.habit_id === 'habit_steps' && h.value > 1000).map((h: any) => h.date)]).size;
    metrics.streak_days = activeDays;

    const workoutDays = new Set((workouts || []).map((w: any) => w.date)).size;
    const restDays = 7 - workoutDays;
    metrics.rest_days = Math.max(0, restDays);

    metrics.cardio_count = (workouts || []).filter((w: any) => (w.exercise_id || '').includes('run') || (w.exercise_id || '').includes('cycling')).length;

    // Update each quest
    for (const quest of quests) {
      const metric = quest.quest_templates?.metric;
      if (!metric) continue;
      const currentValue = metrics[metric] || 0;

      if (currentValue !== quest.current_value) {
        const completed = currentValue >= quest.target_value;
        await supabase.from('quest_slate').update({
          current_value: currentValue,
          ...(completed && quest.status === 'accepted' ? { status: 'completed', completed_at: new Date().toISOString(), xp_awarded: 100 } : {}),
        }).eq('id', quest.id);

        // Award XP on completion
        if (completed && quest.status === 'accepted') {
          const { awardXp } = await import('@/utils/xp-service');
          await awardXp(supabase, userId, { type: 'habit_other' } as any, `Quest: ${metric}`, false);
        }
      }
    }
  } catch (e) {
    console.error('Quest progress check failed:', e);
  }
}
