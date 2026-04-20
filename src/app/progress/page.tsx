import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getProfile, getHistory, getTrainingCatalog } from '@/services/api';
import ProgressCharts from '@/components/ProgressCharts';

export default async function ProgressPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [profile, history, catalog] = await Promise.all([
        getProfile(user.id),
        getHistory(user.id),
        getTrainingCatalog(),
    ]);

    if (!profile) redirect('/login');

    return (
        <div className="min-h-screen bg-black text-white p-4 pt-6">
            <h1 className="text-xl font-black italic uppercase tracking-tighter mb-4">Progress</h1>
            <ProgressCharts
                history={history}
                catalog={catalog}
                bodyweight={profile.bodyweight}
            />
        </div>
    );
}
