import UserProfile from '@/components/UserProfile';
import { createClient } from '@/utils/supabase/server';
import { getProfile, getTrainingCatalog } from '@/services/api';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect('/login');
    }

    const profile = await getProfile(user.id);
    const catalog = await getTrainingCatalog();

    return (
        <div className="min-h-screen bg-black text-white w-full">
            <main className="w-full h-full">
                <UserProfile
                    userId={user.id}
                    displayName={profile?.display_name || 'Warrior'}
                    age={profile?.age || 30}
                    sex={profile?.sex || 'M'}
                    currentWeight={profile?.bodyweight || 180}
                    exercises={catalog}
                    currentTheme={profile?.selected_theme || 'dragon'}
                />
            </main>
        </div>
    );
}
