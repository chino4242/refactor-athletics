import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
  }

  const { messages, userId } = await request.json();
  if (!userId || !messages?.length) {
    return new Response(JSON.stringify({ error: 'Missing userId or messages' }), { status: 400 });
  }

  // Fetch user context server-side
  const supabase = await createClient();
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toLocaleDateString('en-CA');
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toLocaleDateString('en-CA');
  const [{ data: profile }, { data: measurements }, { data: recentWorkouts }, { data: recentHabits }, { data: recentNutrition }, { data: sleepData }] = await Promise.all([
    supabase.from('users').select('age, sex, bodyweight, nutrition_targets, body_composition_goals').eq('id', userId).single(),
    supabase.from('body_measurements').select('date, weight, body_fat_percentage, lean_body_mass, bmr, height').eq('user_id', userId).order('date', { ascending: false }).limit(10),
    supabase.from('workouts').select('date, exercise_id').eq('user_id', userId).gte('date', twoWeeksAgo),
    supabase.from('habit_logs').select('date, habit_id, value').eq('user_id', userId).gte('date', twoWeeksAgo).in('habit_id', ['habit_steps', 'habit_calories_burned']),
    supabase.from('nutrition_logs').select('date, macro_type, amount').eq('user_id', userId).gte('date', oneWeekAgo),
    supabase.from('habit_logs').select('date, value').eq('user_id', userId).eq('habit_id', 'habit_sleep').gte('date', oneWeekAgo),
  ]);

  // Compute activity summary
  const workoutDays = new Set((recentWorkouts || []).map((w: any) => w.date)).size;
  const workoutsPerWeek = Math.round(workoutDays / 2 * 10) / 10; // over 2 weeks
  const stepDays: Record<string, number> = {};
  const burnDays: Record<string, number> = {};
  for (const h of recentHabits || []) {
    if (h.habit_id === 'habit_steps') stepDays[h.date] = (stepDays[h.date] || 0) + (h.value || 0);
    if (h.habit_id === 'habit_calories_burned') burnDays[h.date] = (burnDays[h.date] || 0) + (h.value || 0);
  }
  const avgSteps = Object.values(stepDays).length ? Math.round(Object.values(stepDays).reduce((a, b) => a + b, 0) / Object.values(stepDays).length) : null;
  const avgBurn = Object.values(burnDays).length ? Math.round(Object.values(burnDays).reduce((a, b) => a + b, 0) / Object.values(burnDays).length) : null;

  // Compute nutrition adherence (last 7 days)
  const nutriByDay: Record<string, Record<string, number>> = {};
  for (const n of recentNutrition || []) {
    if (!nutriByDay[n.date]) nutriByDay[n.date] = {};
    nutriByDay[n.date][n.macro_type] = (nutriByDay[n.date][n.macro_type] || 0) + (n.amount || 0);
  }
  const trackedDays = Object.keys(nutriByDay).length;
  const avgProtein = trackedDays ? Math.round(Object.values(nutriByDay).reduce((s, d) => s + (d.protein || 0), 0) / trackedDays) : null;
  const avgCarbs = trackedDays ? Math.round(Object.values(nutriByDay).reduce((s, d) => s + (d.carbs || 0), 0) / trackedDays) : null;
  const avgFat = trackedDays ? Math.round(Object.values(nutriByDay).reduce((s, d) => s + (d.fat || 0), 0) / trackedDays) : null;
  const avgCalsIn = trackedDays ? Math.round(Object.values(nutriByDay).reduce((s, d) => s + (d.calories || 0), 0) / trackedDays) : null;

  // Sleep average
  const avgSleep = (sleepData || []).length ? Math.round((sleepData || []).reduce((s: number, d: any) => s + (d.value || 0), 0) / sleepData!.length * 10) / 10 : null;

  // Weight trend (slope over available data)
  const weightPoints = (measurements || []).filter((m: any) => m.weight).reverse();
  let weightTrend = '';
  if (weightPoints.length >= 3) {
    const first = weightPoints[0].weight;
    const last = weightPoints[weightPoints.length - 1].weight;
    const diff = last - first;
    weightTrend = diff > 1 ? `Trending up (+${diff.toFixed(1)} lbs)` : diff < -1 ? `Trending down (${diff.toFixed(1)} lbs)` : 'Stable';
  }

  const latest = measurements?.[0];
  const weight = latest?.weight || profile?.bodyweight || 180;
  const bf = latest?.body_fat_percentage;
  const leanMass = latest?.lean_body_mass || (bf ? Math.round(weight * (1 - bf / 100)) : null);
  const bmr = latest?.bmr;
  const height = latest?.height;
  const targets = profile?.nutrition_targets;
  const goals = profile?.body_composition_goals;

  const systemPrompt = `You are a knowledgeable, supportive nutrition coach inside a fitness app called Refactor Athletics. You help users set macro targets based on their body composition and goals.

## User Profile
- Age: ${profile?.age || 'unknown'}
- Sex: ${profile?.sex || 'unknown'}
- Current weight: ${weight} lbs (${(weight / 2.205).toFixed(1)} kg)
${bf ? `- Body fat: ${bf}%` : ''}
${leanMass ? `- Lean body mass: ${leanMass} lbs (${(leanMass / 2.205).toFixed(1)} kg)` : ''}
${bmr ? `- BMR (from wearable): ${bmr} cal/day` : ''}
${height ? `- Height: ${height} inches (${Math.round(height * 2.54)} cm)` : ''}
${goals?.target_weight ? `- Target weight: ${goals.target_weight} lbs` : ''}
${targets ? `- Current macro targets: protein ${targets.protein}g, carbs ${targets.carbs}g, fat ${targets.fat}g, calories ${targets.calories}` : '- No macro targets set yet'}

## Activity Data (last 2 weeks)
- Workouts per week: ${workoutsPerWeek}
${avgSteps ? `- Average daily steps: ${avgSteps.toLocaleString()}` : ''}
${avgBurn ? `- Average daily calories burned: ${avgBurn.toLocaleString()}` : ''}
- Activity level estimate: ${workoutsPerWeek >= 5 ? 'Active — trains frequently but not a manual labor job (1.55 multiplier)' : workoutsPerWeek >= 3 ? 'Moderately active (1.45 multiplier)' : 'Lightly active (1.3 multiplier)'}

## Nutrition Adherence (last 7 days)
- Days tracked: ${trackedDays}/7
${avgProtein !== null ? `- Avg daily protein: ${avgProtein}g (target: ${profile?.nutrition_targets?.protein || '?'}g)` : ''}
${avgCarbs !== null ? `- Avg daily carbs: ${avgCarbs}g (target: ${profile?.nutrition_targets?.carbs || '?'}g)` : ''}
${avgFat !== null ? `- Avg daily fat: ${avgFat}g (target: ${profile?.nutrition_targets?.fat || '?'}g)` : ''}
${avgCalsIn !== null && avgBurn ? `- Avg daily net calories: ${avgCalsIn - avgBurn} (in: ${avgCalsIn}, burned: ${avgBurn})` : ''}

## Recovery & Trends
${avgSleep ? `- Average sleep: ${avgSleep} hours/night (last 7 days)` : '- Sleep data: not available'}
${weightTrend ? `- Weight trend (${weightPoints.length} data points): ${weightTrend}` : ''}
${weightPoints.length > 0 ? `- Recent weigh-ins: ${weightPoints.map((w: any) => `${w.date}: ${w.weight}`).join(', ')}` : ''}

## Your Approach
- Be conversational, warm, and encouraging — like a knowledgeable friend, not a textbook
- USE THE DATA ABOVE — never ask the user for information you already have (weight, activity level, body fat, etc.)
- EXPLAIN terms in plain language. Never assume the user knows what BMR, TDEE, or macros mean. Example: instead of "BMR (Katch-McArdle): 1,874" say "Your body burns about 1,874 calories just existing (breathing, digesting, etc). With your workouts factored in, that's about 2,900 total per day."
- Show the logic simply — avoid formula notation like "370 + (21.6 × 67.6)". Instead say "Based on your lean muscle mass, your resting burn is about X"
- Standard guidelines: protein 0.8-1.2g per lb lean mass, fat 0.3-0.4g per lb bodyweight, carbs fill remaining calories
- For fat loss: 300-500 cal deficit. For muscle gain: 200-300 surplus
- Calculate TDEE from BMR × activity multiplier (use the activity data above, don't ask)
- IMPORTANT: Be conservative with activity multipliers. Most people who lift 5-6x/week but have desk jobs are 1.5-1.55, NOT 1.7+. Only use 1.7+ for manual labor jobs combined with heavy training. When in doubt, go lower — users can always eat more if losing too fast.
- If lean body mass is available, use Katch-McArdle for BMR: 370 + (21.6 × LBM in kg). This is more accurate than Mifflin-St Jeor when body comp data exists.
- If no lean mass, use Mifflin-St Jeor: (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5 (male) or -161 (female)
- Don't dump raw formulas — explain what each number MEANS for the user's daily life ("that's about X meals worth" or "think of it as X chicken breasts")
- Flag unrealistic goals kindly but directly. Offer alternatives with timelines
- When the user agrees on targets, end your message with a JSON block on its own line:
  \`\`\`json
  {"recommended": {"protein": X, "carbs": X, "fat": X, "calories": X}}
  \`\`\`
- CRITICAL MATH CHECK: Before presenting any recommendation, verify that protein×4 + carbs×4 + fat×9 = total calories. If they don't match, adjust carbs (the flexible macro) until they do. Never present numbers that don't add up.
- Only include the JSON when presenting a final recommendation the user can apply
- Keep responses under 150 words unless explaining calculations`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: systemPrompt,
    messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
  });

  // Stream the response as SSE
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && (event.delta as any).text) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: (event.delta as any).text })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
