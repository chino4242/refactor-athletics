import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import JoinGroupLanding from '@/components/JoinGroupLanding';
import JoinChallengeLanding from '@/components/JoinChallengeLanding';
import JoinPreview from '@/components/JoinPreview';

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Use service client for preview (bypasses RLS)
    const service = createServiceClient();

    // Check if code matches a public challenge first, then fall back to group
    const { data: challenge } = await service
        .from('public_challenges')
        .select('id')
        .eq('invite_code', code.toUpperCase())
        .single();

    const isChallenge = !!challenge;

    // If not authenticated, show preview with sign-up CTA
    if (!user) {
        // Fetch group/challenge preview data
        const { data: group } = await service
            .from('groups')
            .select('id, name')
            .eq('invite_code', code.toUpperCase())
            .single();

        const memberCount = group
            ? (await service.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', group.id)).count || 0
            : 0;

        return (
            <div className="min-h-screen bg-black text-white w-full">
                <main className="w-full h-full p-4 md:p-8">
                    <JoinPreview
                        groupName={group?.name || null}
                        memberCount={memberCount}
                        code={code}
                        isChallenge={isChallenge}
                    />
                </main>
            </div>
        );
    }

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
