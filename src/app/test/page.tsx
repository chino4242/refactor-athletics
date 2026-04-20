import Calculator from '@/components/Calculator';
import { createClient } from '@/utils/supabase/server';
import { getProfile, getTrainingCatalog } from '@/services/api';
import { redirect } from 'next/navigation';

export default async function TestPage({ searchParams }: { searchParams: Promise<{ exercise?: string }> }) {
    const params = await searchParams;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect('/login');

    const [profile, catalog] = await Promise.all([
        getProfile(user.id),
        getTrainingCatalog(),
    ]);

    // Filter to only exercises with standards (rankable)
    const rankedExercises = catalog.filter((ex: any) => ex.standards);

    return (
        <div className="min-h-screen bg-black text-white w-full">
            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter">Test Your Fitness</h1>
                    <p className="text-sm text-zinc-500 mt-2">Pick an exercise, enter your best result, and earn your rank</p>
                </div>
                <Calculator
                    userId={user.id}
                    bodyweight={profile?.bodyweight || 150}
                    age={profile?.age || 30}
                    sex={profile?.sex || 'M'}
                    exercises={rankedExercises}
                    initialExerciseId={params.exercise || ''}
                    hideBanner
                />
            </main>
        </div>
    );
}
