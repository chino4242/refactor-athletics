import Arena from '@/components/Arena';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function ArenaPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect('/login');
    }

    return (
        <div className="min-h-screen bg-black text-white w-full">
            <main className="w-full h-full">
                <Arena userId={user.id} />
            </main>
        </div>
    );
}

