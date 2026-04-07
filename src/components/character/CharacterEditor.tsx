'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import CharacterAvatar, { type CharacterConfig } from './CharacterAvatar';

interface CharacterEditorProps {
    userId: string;
    initialConfig: CharacterConfig;
    onSave: (config: CharacterConfig) => void;
}

const SKIN_TONES = [
    { hex: '#f5d0a9', label: 'Light' },
    { hex: '#d4a574', label: 'Medium' },
    { hex: '#a67c52', label: 'Tan' },
    { hex: '#8d5524', label: 'Brown' },
    { hex: '#6b3a2a', label: 'Dark' },
    { hex: '#4a2511', label: 'Deep' },
];

const GEAR_SLOTS = ['head', 'torso', 'legs', 'accessory', 'weapon'] as const;
type GearSlot = typeof GEAR_SLOTS[number];

const SLOT_LABELS: Record<GearSlot, { label: string; emoji: string }> = {
    head: { label: 'Head', emoji: '👑' },
    torso: { label: 'Torso', emoji: '👕' },
    legs: { label: 'Legs', emoji: '👖' },
    accessory: { label: 'Accessory', emoji: '⌚' },
    weapon: { label: 'Weapon', emoji: '⚔️' },
};

interface GearItem {
    id: string;
    name: string;
    slot: string;
    image_path: string;
    rarity: string;
    unlocked: boolean;
}

export default function CharacterEditor({ userId, initialConfig, onSave }: CharacterEditorProps) {
    const [config, setConfig] = useState<CharacterConfig>(initialConfig);
    const [unlockedGear, setUnlockedGear] = useState<GearItem[]>([]);
    const [activeSlot, setActiveSlot] = useState<GearSlot>('head');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadGear = async () => {
            const supabase = createClient();
            const [catalogRes, unlockedRes] = await Promise.all([
                supabase.from('gear_catalog').select('*'),
                supabase.from('user_gear').select('gear_id').eq('user_id', userId),
            ]);
            const unlockedIds = new Set((unlockedRes.data || []).map(g => g.gear_id));
            const gear = (catalogRes.data || []).map(g => ({
                ...g,
                unlocked: unlockedIds.has(g.id),
            }));
            setUnlockedGear(gear);
        };
        loadGear();
    }, [userId]);

    const handleSave = async () => {
        setSaving(true);
        const supabase = createClient();
        await supabase.from('users').update({ character_config: config }).eq('id', userId);
        onSave(config);
        setSaving(false);
    };

    const equipGear = (slot: GearSlot, gearId: string | undefined) => {
        setConfig({ ...config, gear: { ...config.gear, [slot]: gearId } });
    };

    const slotGear = unlockedGear.filter(g => g.slot === activeSlot && g.unlocked);

    return (
        <div className="space-y-6">
            {/* Preview */}
            <div className="flex justify-center bg-zinc-800/50 rounded-xl p-6">
                <CharacterAvatar config={config} size="lg" animated />
            </div>

            {/* Body Type */}
            <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Body Type</h3>
                <div className="flex gap-2">
                    {(['male', 'female'] as const).map(body => (
                        <button
                            key={body}
                            onClick={() => setConfig({ ...config, baseBody: body })}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold uppercase transition ${
                                config.baseBody === body
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                        >
                            {body === 'male' ? '🧍‍♂️' : '🧍‍♀️'} {body}
                        </button>
                    ))}
                </div>
            </div>

            {/* Skin Tone */}
            <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Skin Tone</h3>
                <div className="flex gap-2">
                    {SKIN_TONES.map(tone => (
                        <button
                            key={tone.hex}
                            onClick={() => setConfig({ ...config, skinTone: tone.hex })}
                            className={`w-10 h-10 rounded-full border-2 transition ${
                                config.skinTone === tone.hex ? 'border-orange-500 scale-110' : 'border-zinc-700'
                            }`}
                            style={{ backgroundColor: tone.hex }}
                            title={tone.label}
                        />
                    ))}
                </div>
            </div>

            {/* Gear Slots */}
            <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Gear</h3>
                <div className="flex gap-1 mb-3">
                    {GEAR_SLOTS.map(slot => (
                        <button
                            key={slot}
                            onClick={() => setActiveSlot(slot)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                                activeSlot === slot
                                    ? 'bg-zinc-700 text-white'
                                    : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            {SLOT_LABELS[slot].emoji}
                        </button>
                    ))}
                </div>

                {/* Gear items for active slot */}
                <div className="grid grid-cols-3 gap-2">
                    {/* Unequip option */}
                    <button
                        onClick={() => equipGear(activeSlot, undefined)}
                        className={`p-3 rounded-lg border-2 transition text-center ${
                            !config.gear[activeSlot]
                                ? 'border-orange-500 bg-orange-500/10'
                                : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                        }`}
                    >
                        <div className="text-xl mb-1">❌</div>
                        <div className="text-[10px] text-zinc-400">None</div>
                    </button>

                    {slotGear.map(gear => (
                        <button
                            key={gear.id}
                            onClick={() => equipGear(activeSlot, gear.id)}
                            className={`p-3 rounded-lg border-2 transition text-center ${
                                config.gear[activeSlot] === gear.id
                                    ? 'border-orange-500 bg-orange-500/10'
                                    : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                            }`}
                        >
                            {gear.image_path ? (
                                <img src={gear.image_path} alt={gear.name} className="w-10 h-10 mx-auto mb-1 object-contain" />
                            ) : (
                                <div className="w-10 h-10 mx-auto mb-1 bg-zinc-700 rounded flex items-center justify-center text-lg">
                                    {SLOT_LABELS[activeSlot].emoji}
                                </div>
                            )}
                            <div className="text-[10px] text-zinc-300 truncate">{gear.name}</div>
                            <div className={`text-[9px] font-bold uppercase ${
                                gear.rarity === 'legendary' ? 'text-yellow-400' :
                                gear.rarity === 'epic' ? 'text-purple-400' :
                                gear.rarity === 'rare' ? 'text-blue-400' : 'text-zinc-500'
                            }`}>{gear.rarity}</div>
                        </button>
                    ))}

                    {slotGear.length === 0 && (
                        <div className="col-span-2 text-center py-4 text-xs text-zinc-600">
                            No gear unlocked for this slot
                        </div>
                    )}
                </div>
            </div>

            {/* Save */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-orange-600 text-white font-bold uppercase rounded-lg hover:bg-orange-500 transition disabled:opacity-50"
            >
                {saving ? 'Saving...' : 'Save Character'}
            </button>
        </div>
    );
}
