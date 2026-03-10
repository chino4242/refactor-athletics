"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import CharacterAvatar from '@/components/character/CharacterAvatar';
import CharacterEditor from '@/components/character/CharacterEditor';
import { CharacterConfig } from '@/types/character';

export default function CharacterTestClient({ userId }: { userId: string }) {
    const [characterConfig, setCharacterConfig] = useState<CharacterConfig | null>(null);
    const [powerLevel, setPowerLevel] = useState(0);
    const [careerXp, setCareerXp] = useState(0);
    const [showEditor, setShowEditor] = useState(false);

    useEffect(() => {
        loadCharacter();
    }, [userId]);

    const loadCharacter = async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from('users')
            .select('character_config, power_level, career_xp')
            .eq('id', userId)
            .single();

        if (data) {
            setCharacterConfig(data.character_config);
            setPowerLevel(data.power_level || 0);
            setCareerXp(data.career_xp || 0);
        }
    };

    if (!characterConfig) {
        return <div className="min-h-screen bg-black text-white p-8">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-black mb-8">Character System</h1>

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

                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 mb-8">
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

                <button
                    onClick={() => setShowEditor(true)}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-lg text-lg"
                >
                    Open Character Editor
                </button>
            </div>

            {showEditor && (
                <CharacterEditor
                    userId={userId}
                    initialCharacter={characterConfig}
                    powerLevel={powerLevel}
                    careerXp={careerXp}
                    onClose={() => setShowEditor(false)}
                    onSave={(newCharacter) => {
                        setCharacterConfig(newCharacter);
                        loadCharacter();
                    }}
                />
            )}
        </div>
    );
}
