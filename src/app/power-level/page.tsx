import { createClient } from '@/utils/supabase/server';
import { getProfile, getHistory, getTrainingCatalog, getUserStats } from '@/services/api';
import { redirect } from 'next/navigation';
import PowerLevelPage from '@/components/PowerLevelPage';
import { PATH_KEY_EXERCISES } from '@/data/pathExercises';

export default async function PowerPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');

    const [profile, history, catalog, stats] = await Promise.all([
        getProfile(user.id),
        getHistory(user.id),
        getTrainingCatalog(),
        getUserStats(user.id),
    ]);

    // Percentile: compare power levels across all users
    let percentile: number | null = null;
    const myPower = stats?.power_level || 0;
    if (myPower > 0) {
        const { data: allWorkouts } = await supabase.from('workouts').select('user_id, exercise_id, level');
        if (allWorkouts?.length) {
            // Compute power level per user: sum of max level per exercise
            const userExBest = new Map<string, Map<string, number>>();
            for (const w of allWorkouts) {
                if (!w.level) continue;
                if (!userExBest.has(w.user_id)) userExBest.set(w.user_id, new Map());
                const exMap = userExBest.get(w.user_id)!;
                exMap.set(w.exercise_id, Math.max(exMap.get(w.exercise_id) || 0, w.level));
            }
            const scores = Array.from(userExBest.values()).map(m => Array.from(m.values()).reduce((a, b) => a + b, 0));
            if (scores.length > 1) {
                const below = scores.filter(s => s < myPower).length;
                percentile = Math.round((below / scores.length) * 100);
            }
        }
    }

    const userPath = profile?.selected_path || 'hybrid';
    const pathExerciseIds = PATH_KEY_EXERCISES[userPath] || PATH_KEY_EXERCISES['hybrid'];

    // Fetch power level weekly history for trend chart
    const { data: powerHistory } = await supabase.from('power_level_history')
        .select('week_start, power_level')
        .eq('user_id', user.id)
        .order('week_start', { ascending: true })
        .limit(12);

    return (
        <div className="min-h-screen bg-black text-white w-full">
            <main className="max-w-lg mx-auto px-4 py-6 pb-32">
                <PowerLevelPage
                    userId={user.id}
                    profile={profile}
                    history={history}
                    catalog={catalog}
                    stats={stats}
                    pathExerciseIds={pathExerciseIds}
                    percentile={percentile}
                    powerHistory={powerHistory || []}
                />
            </main>
        </div>
    );
}
