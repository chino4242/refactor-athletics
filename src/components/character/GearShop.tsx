'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Lock, Check, Zap } from 'lucide-react';

interface GearShopProps {
    userId: string;
    careerXp: number;
    powerLevel: number;
    onUnlock: () => void;
}

interface GearItem {
    id: string;
    name: string;
    slot: string;
    image_path: string;
    xp_cost: number;
    theme: string | null;
    rarity: string;
    min_power_level: number;
    description: string | null;
    unlocked: boolean;
}

const RARITY_COLORS: Record<string, string> = {
    common: 'text-zinc-400 border-zinc-600',
    rare: 'text-blue-400 border-blue-600',
    epic: 'text-purple-400 border-purple-600',
    legendary: 'text-yellow-400 border-yellow-600',
};

export default function GearShop({ userId, careerXp, powerLevel, onUnlock }: GearShopProps) {
    const [gear, setGear] = useState<GearItem[]>([]);
    const [filter, setFilter] = useState<string>('all');
    const [unlocking, setUnlocking] = useState<string | null>(null);

    useEffect(() => {
        const loadGear = async () => {
            const supabase = createClient();
            const [catalogRes, unlockedRes] = await Promise.all([
                supabase.from('gear_catalog').select('*').order('xp_cost'),
                supabase.from('user_gear').select('gear_id').eq('user_id', userId),
            ]);
            const unlockedIds = new Set((unlockedRes.data || []).map(g => g.gear_id));
            setGear((catalogRes.data || []).map(g => ({ ...g, unlocked: unlockedIds.has(g.id) })));
        };
        loadGear();
    }, [userId]);

    const handleUnlock = async (item: GearItem) => {
        if (item.unlocked || careerXp < item.xp_cost || powerLevel < item.min_power_level) return;
        setUnlocking(item.id);
        const supabase = createClient();
        await supabase.from('user_gear').insert({ user_id: userId, gear_id: item.id });
        setGear(prev => prev.map(g => g.id === item.id ? { ...g, unlocked: true } : g));
        setUnlocking(null);
        onUnlock();
    };

    const slots = ['all', 'head', 'torso', 'legs', 'accessory', 'weapon'];
    const filtered = filter === 'all' ? gear : gear.filter(g => g.slot === filter);

    return (
        <div className="space-y-4">
            {/* XP Display */}
            <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                    <Zap size={16} className="text-orange-500" />
                    <span className="text-base font-bold text-white">Career XP</span>
                </div>
                <span className="text-lg font-black text-orange-500">{careerXp.toLocaleString()}</span>
            </div>

            {/* Slot Filter */}
            <div className="flex gap-1 overflow-x-auto">
                {slots.map(slot => (
                    <button
                        key={slot}
                        onClick={() => setFilter(slot)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition ${
                            filter === slot ? 'bg-zinc-700 text-white' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        {slot}
                    </button>
                ))}
            </div>

            {/* Gear Grid */}
            <div className="grid grid-cols-2 gap-3">
                {filtered.map(item => {
                    const canAfford = careerXp >= item.xp_cost;
                    const meetsPL = powerLevel >= item.min_power_level;
                    const canUnlock = !item.unlocked && canAfford && meetsPL;
                    const rarityClass = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;

                    return (
                        <div
                            key={item.id}
                            className={`rounded-xl border p-3 transition ${
                                item.unlocked ? 'border-emerald-600/50 bg-emerald-950/20' : `border-zinc-700 bg-zinc-900`
                            }`}
                        >
                            {/* Image */}
                            <div className="w-full aspect-square bg-zinc-800 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                                {item.image_path ? (
                                    <img src={item.image_path} alt={item.name} className="w-full h-full object-contain p-2" />
                                ) : (
                                    <span className="text-3xl opacity-30">🎭</span>
                                )}
                            </div>

                            {/* Info */}
                            <p className="text-xs font-bold text-white truncate">{item.name}</p>
                            <p className={`text-xs font-bold uppercase ${rarityClass.split(' ')[0]}`}>{item.rarity}</p>

                            {/* Action */}
                            {item.unlocked ? (
                                <div className="mt-2 flex items-center gap-1 text-emerald-400 text-xs font-bold">
                                    <Check size={12} /> Owned
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleUnlock(item)}
                                    disabled={!canUnlock || unlocking === item.id}
                                    className={`mt-2 w-full py-1.5 rounded text-xs font-bold uppercase transition ${
                                        canUnlock
                                            ? 'bg-orange-600 text-white hover:bg-orange-500'
                                            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                    }`}
                                >
                                    {unlocking === item.id ? '...' : !meetsPL ? (
                                        <span className="flex items-center justify-center gap-1"><Lock size={10} /> PL {item.min_power_level}</span>
                                    ) : (
                                        <span>{item.xp_cost.toLocaleString()} XP</span>
                                    )}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-8 text-zinc-600 text-base">No gear available</div>
            )}
        </div>
    );
}
