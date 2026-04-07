'use client';

import { useState } from 'react';
import CharacterEditor from '@/components/character/CharacterEditor';
import GearShop from '@/components/character/GearShop';
import type { CharacterConfig } from '@/components/character/CharacterAvatar';

interface Props {
    userId: string;
    initialConfig: CharacterConfig;
    careerXp: number;
}

export default function CharacterPageClient({ userId, initialConfig, careerXp }: Props) {
    const [tab, setTab] = useState<'editor' | 'shop'>('editor');
    const [config, setConfig] = useState<CharacterConfig>(initialConfig);
    const [xp, setXp] = useState(careerXp);

    return (
        <div className="max-w-md mx-auto space-y-4">
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Your Character</h1>

            {/* Tabs */}
            <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl">
                <button
                    onClick={() => setTab('editor')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${
                        tab === 'editor' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'
                    }`}
                >
                    🧍 Customize
                </button>
                <button
                    onClick={() => setTab('shop')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${
                        tab === 'shop' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'
                    }`}
                >
                    🛒 Gear Shop
                </button>
            </div>

            {/* Content */}
            {tab === 'editor' && (
                <CharacterEditor userId={userId} initialConfig={config} onSave={setConfig} />
            )}
            {tab === 'shop' && (
                <GearShop userId={userId} careerXp={xp} powerLevel={0} onUnlock={() => setXp(prev => prev)} />
            )}
        </div>
    );
}
