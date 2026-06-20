import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import FuelScreen from '@/components/v2/FuelScreen';

export default async function FuelPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    return <FuelScreen userId={user.id} />;
}
