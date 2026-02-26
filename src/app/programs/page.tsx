import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ProgramBuilder from '@/components/ProgramBuilder';

export default async function ProgramsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 py-8">
            <ProgramBuilder userId={user.id} />
        </main>
    );
}
