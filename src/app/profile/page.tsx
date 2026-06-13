import ProfileScreen from '@/components/v2/ProfileScreen';
import { createClient } from '@/utils/supabase/server';
import { getProfile } from '@/services/api';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect('/login');
    }

    const profile = await getProfile(user.id);

    return (
        <ProfileScreen
            userId={user.id}
            displayName={profile?.display_name || 'Warrior'}
            age={profile?.age || 30}
            sex={profile?.sex || 'M'}
            currentWeight={profile?.bodyweight || 180}
            currentTheme={profile?.selected_theme || 'dragon'}
        />
    );
}
