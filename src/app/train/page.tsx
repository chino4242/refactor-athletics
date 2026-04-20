import TrainingV2 from '@/components/TrainingV2';
import { createClient } from '@/utils/supabase/server';
import { getProfile, getHistory, getTrainingCatalog, getUserStats } from '@/services/api';
import { redirect } from 'next/navigation';

export default async function TrainPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect('/login');
    }

    const [profile, history, catalog, stats] = await Promise.all([
        getProfile(user.id),
        getHistory(user.id),
        getTrainingCatalog(),
        getUserStats(user.id),
    ]);

    return (
        <div className="min-h-screen bg-black text-white w-full">
            <main className="w-full h-full">
                <TrainingV2
                    userId={user.id}
                    bodyweight={profile?.bodyweight || 180}
                    age={profile?.age || 30}
                    sex={profile?.sex || 'M'}
                    initialHistory={history}
                    initialCatalog={catalog}
                    highestLevel={stats?.highest_level_achieved || 0}
                />
            </main>
        </div>
    );
}
