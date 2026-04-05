import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import JoinGroupLanding from '@/components/JoinGroupLanding';

export default async function JoinGroupPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect(`/login?redirect=/join/${code}`);
    }

    return (
        <div className="min-h-screen bg-black text-white w-full">
            <main className="w-full h-full p-4 md:p-8">
                <JoinGroupLanding currentUserId={user.id} inviteCode={code} />
            </main>
        </div>
    );
}
