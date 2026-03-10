import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import CharacterAvatar from '@/components/character/CharacterAvatar';
import { CharacterConfig } from '@/types/character';

export default async function CharacterTestPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect('/login');
    }

    const { data: userData } = await supabase
        .from('users')
        .select('character_config, power_level, career_xp')
        .eq('id', user.id)
        .single();

    const characterConfig: CharacterConfig = userData?.character_config || {
        baseBody: 'male',
        powerLevelTier: 1,
        skinTone: '#d4a574',
        gear: {},
        auraEnabled: false,
        particleEffects: false
    };

    const powerLevel = userData?.power_level || 0;
    const careerXp = userData?.career_xp || 0;

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-black mb-8">Character System Test</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                        <h2 className="text-sm font-bold mb-4 text-zinc-400">Small (64px)</h2>
                        <CharacterAvatar
                            character={characterConfig}
                            powerLevel={powerLevel}
                            size="sm"
                        />
                    </div>

                    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                        <h2 className="text-sm font-bold mb-4 text-zinc-400">Medium (128px)</h2>
                        <CharacterAvatar
                            character={characterConfig}
                            powerLevel={powerLevel}
                            size="md"
                        />
                    </div>

                    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                        <h2 className="text-sm font-bold mb-4 text-zinc-400">Large (256px)</h2>
                        <CharacterAvatar
                            character={characterConfig}
                            powerLevel={powerLevel}
                            size="lg"
                            animated
                        />
                    </div>
                </div>

                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                    <h2 className="text-lg font-bold mb-4">Your Stats</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-zinc-400">Power Level</div>
                            <div className="text-2xl font-bold text-orange-500">{powerLevel}</div>
                        </div>
                        <div>
                            <div className="text-sm text-zinc-400">Career XP</div>
                            <div className="text-2xl font-bold text-blue-500">{careerXp}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
