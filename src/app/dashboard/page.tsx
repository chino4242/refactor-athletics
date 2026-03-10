import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/dashboard/DashboardClient';
import OnboardingWizard from '@/components/OnboardingWizard';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Check if user needs onboarding
    const { data: profile } = await supabase
        .from('users')
        .select('is_onboarded')
        .eq('id', user.id)
        .single();

    if (!profile?.is_onboarded) {
        return <OnboardingWizard userId={user.id} />;
    }

    return <DashboardClient userId={user.id} />;
}
