import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import WorkoutHistory from '@/components/WorkoutHistory';

export default async function HistoryPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    return (
        <main className="min-h-screen bg-zinc-950 text-white pb-24">
            <WorkoutHistory userId={user.id} />
        </main>
    );
}
