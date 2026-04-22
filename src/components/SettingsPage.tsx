"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveProfile } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import { useExperienceMode } from '@/context/ExperienceModeContext';
import { THEMES } from '@/data/themes';
import { Settings, User, Target, Palette, ChevronLeft, RefreshCw, Copy, Check, Link2 } from 'lucide-react';
import type { UserProfileData } from '@/types';

interface SettingsPageClientProps {
    userId: string;
    initialProfile: UserProfileData | null;
}

export default function SettingsPageClient({ userId, initialProfile }: SettingsPageClientProps) {
    const router = useRouter();
    const toast = useToast();
    const { currentTheme, setCurrentTheme } = useTheme();
    const { isClassic } = useExperienceMode();
    const [loading, setLoading] = useState(false);
    const [showThemes, setShowThemes] = useState(false);
    const [syncToken, setSyncToken] = useState(initialProfile?.sync_token || '');
    const [tokenCopied, setTokenCopied] = useState(false);
    const [generatingToken, setGeneratingToken] = useState(false);
    const [whoopConnected, setWhoopConnected] = useState(!!initialProfile?.whoop_connected_at);
    const [whoopSyncing, setWhoopSyncing] = useState(false);

    // Profile fields
    const [displayName, setDisplayName] = useState(initialProfile?.display_name || '');
    const [age, setAge] = useState(initialProfile?.age || 30);
    const [sex, setSex] = useState(initialProfile?.sex || 'M');
    const [bodyweight, setBodyweight] = useState(initialProfile?.bodyweight || 180);

    // Habit targets
    const [targets, setTargets] = useState<Record<string, number>>({
        habit_steps: initialProfile?.habit_targets?.habit_steps || 10000,
        habit_water: initialProfile?.nutrition_targets?.water || initialProfile?.habit_targets?.habit_water || 100,
        habit_reading: initialProfile?.habit_targets?.habit_reading || 10,
        habit_mobility: initialProfile?.habit_targets?.habit_mobility || 15,
        habit_meditation: initialProfile?.habit_targets?.habit_meditation || 10,
    });

    const handleThemeSelect = (themeKey: string) => {
        setCurrentTheme(themeKey);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await saveProfile({
                ...initialProfile,
                user_id: userId,
                display_name: displayName,
                age,
                sex,
                bodyweight,
                habit_targets: targets,
                selected_theme: currentTheme,
            });
            toast.success('Settings saved!');
        } catch (e) {
            toast.error('Failed to save settings.');
        } finally {
            setLoading(false);
        }
    };

    const generateSyncToken = async () => {
        setGeneratingToken(true);
        try {
            const res = await fetch('/api/sync/token', { method: 'POST' });
            const data = await res.json();
            if (data.token) {
                setSyncToken(data.token);
                toast.success('Sync token generated!');
            } else {
                toast.error('Failed to generate token');
            }
        } catch { toast.error('Failed to generate token'); }
        finally { setGeneratingToken(false); }
    };

    const copySyncToken = () => {
        navigator.clipboard.writeText(syncToken);
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 2000);
    };

    const syncWhoop = async () => {
        setWhoopSyncing(true);
        try {
            const res = await fetch('/api/whoop/sync', { method: 'POST' });
            const data = await res.json();
            if (data.synced) toast.success(`Synced: ${data.synced.join(', ')}`);
            else toast.error(data.error || 'Sync failed');
        } catch { toast.error('Sync failed'); }
        finally { setWhoopSyncing(false); }
    };

    const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono";
    const labelClass = "text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block";

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                    <Settings size={24} className="text-emerald-400" />
                    <h1 className="text-2xl font-black uppercase tracking-widest">Settings</h1>
                </div>
            </div>

            <div className="space-y-6">
                {/* Theme Picker */}
                {(isClassic && !showThemes) ? (
                <button
                    onClick={() => setShowThemes(true)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left hover:border-zinc-700 transition"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Palette size={16} className="text-zinc-500" />
                            <span className="text-sm text-zinc-400">Customize Theme</span>
                        </div>
                        <span className="text-xs text-zinc-600">Optional</span>
                    </div>
                </button>
                ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Palette size={16} className="text-purple-400" />
                        <h2 className="text-sm font-black uppercase tracking-widest">Theme</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(THEMES).map(([key, theme]) => (
                            <button
                                key={key}
                                onClick={() => handleThemeSelect(key)}
                                className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-video ${currentTheme === key
                                    ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                                    : 'border-zinc-700 hover:border-zinc-500'
                                    }`}
                            >
                                <img
                                    src={`/themes/${key}/banner.png`}
                                    alt={theme.displayName}
                                    className="w-full h-full object-cover opacity-70"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <div className="absolute bottom-2 left-2 right-2">
                                    <p className="text-white text-xs font-black uppercase tracking-wider leading-tight">
                                        {theme.emoji} {theme.displayName}
                                    </p>
                                </div>
                                {currentTheme === key && (
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center">
                                        <span className="text-black text-xs font-black">✓</span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                )}

                {/* Profile Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <User size={16} className="text-emerald-400" />
                        <h2 className="text-sm font-black uppercase tracking-widest">Profile</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Display Name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                className={inputClass}
                                placeholder="Warrior"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Age</label>
                                <input
                                    type="number"
                                    value={age}
                                    onChange={e => setAge(Number(e.target.value))}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Sex</label>
                                <select
                                    value={sex}
                                    onChange={e => setSex(e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="M">Male</option>
                                    <option value="F">Female</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Bodyweight (lbs)</label>
                            <input
                                type="number"
                                value={bodyweight}
                                onChange={e => setBodyweight(Number(e.target.value))}
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>

                {/* Habit Targets Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Target size={16} className="text-orange-400" />
                        <h2 className="text-sm font-black uppercase tracking-widest">Daily Targets</h2>
                    </div>
                    <div className="space-y-4">
                        {[
                            { key: 'habit_steps', label: 'Steps', unit: 'steps' },
                            { key: 'habit_water', label: 'Water', unit: 'oz' },
                            { key: 'habit_reading', label: 'Reading', unit: 'min' },
                            { key: 'habit_mobility', label: 'Mobility', unit: 'min' },
                            { key: 'habit_meditation', label: 'Meditation', unit: 'min' },
                        ].map(({ key, label, unit }) => (
                            <div key={key} className="flex items-center gap-4">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest w-28 shrink-0">{label}</label>
                                <input
                                    type="number"
                                    value={targets[key]}
                                    onChange={e => setTargets(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono text-sm"
                                />
                                <span className="text-zinc-500 text-xs w-10">{unit}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Health Sync Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Link2 size={16} className="text-blue-400" />
                        <h2 className="text-sm font-black uppercase tracking-widest">Integrations</h2>
                    </div>

                    {/* WHOOP */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">⌚</span>
                                <span className="text-sm font-bold text-white">WHOOP</span>
                            </div>
                            {whoopConnected && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Connected</span>}
                        </div>
                        <p className="text-zinc-500 text-xs mb-3">Auto-sync strain, recovery, sleep, and HRV.</p>
                        {whoopConnected ? (
                            <button
                                onClick={syncWhoop}
                                disabled={whoopSyncing}
                                className="w-full py-2.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition disabled:opacity-50"
                            >
                                {whoopSyncing ? 'Syncing...' : 'Sync Now'}
                            </button>
                        ) : (
                            <a
                                href="/api/whoop/auth"
                                className="block w-full text-center py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition"
                            >
                                Connect WHOOP
                            </a>
                        )}
                    </div>

                    <hr className="border-zinc-800 my-4" />

                    {/* Manual Sync Token */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📱</span>
                            <span className="text-sm font-bold text-white">Apple Health / Manual</span>
                        </div>
                        <p className="text-zinc-500 text-xs mb-3">Sync via Apple Shortcuts or HTTP webhook.</p>

                    {syncToken ? (
                        <div className="space-y-3">
                            <div>
                                <label className={labelClass}>Your Sync Token</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={syncToken}
                                        readOnly
                                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-zinc-300 font-mono text-xs select-all"
                                        onClick={e => (e.target as HTMLInputElement).select()}
                                    />
                                    <button
                                        onClick={copySyncToken}
                                        className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition shrink-0"
                                    >
                                        {tokenCopied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-zinc-400" />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <a
                                    href="/sync/setup"
                                    className="flex-1 text-center py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition"
                                >
                                    Setup Guide
                                </a>
                                <button
                                    onClick={generateSyncToken}
                                    disabled={generatingToken}
                                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition text-zinc-400 text-xs"
                                >
                                    <RefreshCw size={14} className={generatingToken ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={generateSyncToken}
                            disabled={generatingToken}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider text-sm rounded-xl transition disabled:opacity-50"
                        >
                            {generatingToken ? 'Generating...' : 'Enable Health Sync'}
                        </button>
                    )}
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
}
