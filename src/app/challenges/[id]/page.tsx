import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import PublicChallengeDetail from '@/components/challenges/PublicChallengeDetail';

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect(`/login?redirect=/challenges/${id}`);

    return (
        <div className="min-h-screen bg-black text-white w-full">
            <main className="w-full h-full p-4 md:p-8 max-w-2xl mx-auto">
                <PublicChallengeDetail challengeId={id} currentUserId={user.id} />
            </main>
        </div>
    );
}
