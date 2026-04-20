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

    const userPath = profile?.selected_path || 'hybrid';
    const pathExerciseIds = PATH_KEY_EXERCISES[userPath] || PATH_KEY_EXERCISES['hybrid'];

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
                />
            </main>
        </div>
    );
}
