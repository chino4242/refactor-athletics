import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import CharacterTestClient from './CharacterTestClient';

export default async function CharacterTestPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect('/login');
    }

    return <CharacterTestClient userId={user.id} />;
}
