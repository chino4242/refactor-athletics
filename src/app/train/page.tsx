import Training from '@/components/Training';
import { createClient } from '@/utils/supabase/server';
import { getProfile, getHistory, getTrainingCatalog } from '@/services/api';
import { redirect } from 'next/navigation';

export default async function TrainPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect('/login');
    }

    // Fetch all required data on the Server
    const profile = await getProfile(user.id);
    const history = await getHistory(user.id);
    const catalog = await getTrainingCatalog();

    const bodyweight = profile?.bodyweight || 180;
    const age = profile?.age || 30;
    const sex = profile?.sex || 'M';

    return (
        <div className="min-h-screen bg-black text-white w-full">
            <main className="w-full h-full">
                <Training
                    userId={user.id}
                    bodyweight={bodyweight}
                    age={age}
                    sex={sex}
                    initialHistory={history}
                    initialCatalog={catalog}
                />
            </main>
        </div>
    );
}
