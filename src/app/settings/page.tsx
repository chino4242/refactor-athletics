import SettingsPageClient from '@/components/SettingsPage';
import { createClient } from '@/utils/supabase/server';
import { getProfile } from '@/services/api';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect('/login');
    }

    const profile = await getProfile(user.id);

    return (
        <SettingsPageClient
            userId={user.id}
            initialProfile={profile}
        />
    );
}
