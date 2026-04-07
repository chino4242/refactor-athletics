import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import CharacterPageClient from './CharacterPageClient';

export default async function CharacterPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');

    const { data: profile } = await supabase
        .from('users')
        .select('character_config, career_xp, experience_mode')
        .eq('id', user.id)
        .single();

    if (profile?.experience_mode === 'classic') return redirect('/dashboard');

    return <CharacterPageClient userId={user.id} initialConfig={profile?.character_config} careerXp={profile?.career_xp || 0} />;
}
