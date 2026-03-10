"use client";

import { useState, useEffect } from 'react';
import { X, Lock, Check } from 'lucide-react';
import CharacterAvatar from './CharacterAvatar';
import { CharacterConfig, GearItem, getPowerLevelTier, getTierName, getRarityColor, getRarityBorderColor } from '@/types/character';

interface CharacterEditorProps {
    userId: string;
    initialCharacter: CharacterConfig;
    powerLevel: number;
    careerXp: number;
    onClose: () => void;
    onSave: (character: CharacterConfig) => void;
}

export default function CharacterEditor({
    userId,
    initialCharacter,
    powerLevel,
    careerXp,
    onClose,
    onSave
}: CharacterEditorProps) {
    const [character, setCharacter] = useState<CharacterConfig>(initialCharacter);
    const [allGear, setAllGear] = useState<GearItem[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<'head' | 'torso' | 'legs' | 'accessory' | 'weapon'>('head');
    const [loading, setLoading] = useState(false);
    const [unlocking, setUnlocking] = useState<string | null>(null);

    const currentTier = getPowerLevelTier(powerLevel);

    useEffect(() => {
        loadGear();
    }, []);

    const loadGear = async () => {
        try {
            const response = await fetch('/api/character/gear');
            const data = await response.json();
            setAllGear(data);
        } catch (e) {
            console.error('Failed to load gear:', e);
        }
    };

    const handleUnlockGear = async (gearId: string) => {
        setUnlocking(gearId);
        try {
            const response = await fetch('/api/character/unlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gearId })
            });

            if (response.ok) {
                await loadGear(); // Refresh gear list
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to unlock gear');
            }
        } catch (e) {
            console.error('Failed to unlock gear:', e);
        } finally {
            setUnlocking(null);
        }
    };

    const handleEquipGear = (gearId: string | null) => {
        setCharacter({
            ...character,
            gear: {
                ...character.gear,
                [selectedSlot]: gearId || undefined
            }
        });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/character/equip', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gear: character.gear })
            });

            if (response.ok) {
                onSave(character);
                onClose();
            }
        } catch (e) {
            console.error('Failed to save character:', e);
        } finally {
            setLoading(false);
        }
    };

    const gearForSlot = allGear.filter(g => g.slot === selectedSlot);
    const equippedGearId = character.gear[selectedSlot];

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black italic text-white uppercase">Character Editor</h1>
                    <p className="text-xs text-zinc-500 mt-1">
                        {getTierName(currentTier)} • Power Level: {powerLevel} • Career XP: {careerXp.toLocaleString()}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="text-zinc-500 hover:text-white transition p-2"
                >
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto p-4 md:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left: Preview */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
                            <h2 className="text-lg font-bold text-white mb-4">Preview</h2>
                            <div className="flex justify-center">
                                <CharacterAvatar
                                    character={character}
                                    powerLevel={powerLevel}
                                    size="lg"
                                    animated
                                />
                            </div>
                        </div>

                        {/* Right: Gear Selection */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <h2 className="text-lg font-bold text-white mb-4">Equipment</h2>

                            {/* Slot Tabs */}
                            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                                {(['head', 'torso', 'legs', 'accessory', 'weapon'] as const).map(slot => (
                                    <button
                                        key={slot}
                                        onClick={() => setSelectedSlot(slot)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition ${
                                            selectedSlot === slot
                                                ? 'bg-orange-600 text-white'
                                                : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                        }`}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>

                            {/* Unequip Option */}
                            <div className="mb-4">
                                <button
                                    onClick={() => handleEquipGear(null)}
                                    className={`w-full p-3 rounded-lg border-2 transition ${
                                        !equippedGearId
                                            ? 'border-orange-500 bg-orange-500/10'
                                            : 'border-zinc-700 hover:border-zinc-600'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-white">None (Unequip)</span>
                                        {!equippedGearId && <Check size={16} className="text-orange-500" />}
                                    </div>
                                </button>
                            </div>

                            {/* Gear Grid */}
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {gearForSlot.map(gear => {
                                    const isLocked = !gear.unlocked;
                                    const isPowerLevelLocked = powerLevel < gear.min_power_level;
                                    const isXpLocked = careerXp < gear.xp_cost;
                                    const isEquipped = equippedGearId === gear.id;
                                    const canUnlock = !isLocked && !isPowerLevelLocked && !isXpLocked;

                                    return (
                                        <div
                                            key={gear.id}
                                            className={`p-3 rounded-lg border-2 transition ${
                                                isEquipped
                                                    ? 'border-orange-500 bg-orange-500/10'
                                                    : isLocked
                                                    ? `${getRarityBorderColor(gear.rarity)} opacity-50`
                                                    : `${getRarityBorderColor(gear.rarity)} hover:border-opacity-100`
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className={`text-sm font-bold ${getRarityColor(gear.rarity)}`}>
                                                            {gear.name}
                                                        </h3>
                                                        {isEquipped && <Check size={14} className="text-orange-500" />}
                                                    </div>
                                                    <p className="text-xs text-zinc-500 mb-2">{gear.description}</p>
                                                    
                                                    {/* Requirements */}
                                                    <div className="flex flex-wrap gap-2 text-xs">
                                                        {gear.xp_cost > 0 && (
                                                            <span className={isXpLocked ? 'text-red-400' : 'text-blue-400'}>
                                                                {gear.xp_cost.toLocaleString()} XP
                                                            </span>
                                                        )}
                                                        {gear.min_power_level > 0 && (
                                                            <span className={isPowerLevelLocked ? 'text-red-400' : 'text-orange-400'}>
                                                                PL {gear.min_power_level}+
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Button */}
                                                <div>
                                                    {isLocked ? (
                                                        isPowerLevelLocked ? (
                                                            <button
                                                                disabled
                                                                className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-600 text-xs font-bold flex items-center gap-1"
                                                            >
                                                                <Lock size={12} />
                                                                Low PL
                                                            </button>
                                                        ) : isXpLocked ? (
                                                            <button
                                                                disabled
                                                                className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-600 text-xs font-bold flex items-center gap-1"
                                                            >
                                                                <Lock size={12} />
                                                                Low XP
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleUnlockGear(gear.id)}
                                                                disabled={unlocking === gear.id}
                                                                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                                                            >
                                                                {unlocking === gear.id ? 'Unlocking...' : 'Unlock'}
                                                            </button>
                                                        )
                                                    ) : (
                                                        <button
                                                            onClick={() => handleEquipGear(gear.id)}
                                                            className={`px-3 py-1.5 rounded text-xs font-bold ${
                                                                isEquipped
                                                                    ? 'bg-zinc-800 text-zinc-400'
                                                                    : 'bg-orange-600 hover:bg-orange-500 text-white'
                                                            }`}
                                                        >
                                                            {isEquipped ? 'Equipped' : 'Equip'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {gearForSlot.length === 0 && (
                                    <div className="text-center py-8 text-zinc-500 text-sm">
                                        No gear available for this slot yet
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-zinc-900 border-t border-zinc-800 p-4 flex gap-3">
                <button
                    onClick={onClose}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-lg transition"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                >
                    {loading ? 'Saving...' : 'Save Character'}
                </button>
            </div>
        </div>
    );
}
