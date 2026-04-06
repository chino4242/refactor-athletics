import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import JoinGroupLanding from '@/components/JoinGroupLanding';
import JoinChallengeLanding from '@/components/JoinChallengeLanding';

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect(`/login?redirect=/join/${code}`);
    }

    // Check if code matches a public challenge first, then fall back to group
    const { data: challenge } = await supabase
        .from('public_challenges')
        .select('id')
        .eq('invite_code', code.toUpperCase())
        .single();

    const isChallenge = !!challenge;

    return (
        <div className="min-h-screen bg-black text-white w-full">
            <main className="w-full h-full p-4 md:p-8">
                {isChallenge ? (
                    <JoinChallengeLanding currentUserId={user.id} inviteCode={code} />
                ) : (
                    <JoinGroupLanding currentUserId={user.id} inviteCode={code} />
                )}
            </main>
        </div>
    );
}
