"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveProfile } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import { useExperienceMode } from '@/context/ExperienceModeContext';
import { THEMES } from '@/data/themes';
import { Settings, User, Target, Palette, ChevronLeft, RefreshCw, Copy, Check, Link2, Eye, EyeOff, Dumbbell } from 'lucide-react';
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
    const [lastWhoopSync, setLastWhoopSync] = useState<string | null>(null);
    const [googleConnected, setGoogleConnected] = useState(!!initialProfile?.google_health_connected_at);
    const [googleSyncing, setGoogleSyncing] = useState(false);

    // Handle OAuth redirect feedback
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('whoop') === 'connected') {
            setWhoopConnected(true);
            toast.success('WHOOP connected successfully!');
            window.history.replaceState({}, '', '/settings');
        } else if (params.get('whoop') === 'error') {
            const detail = params.get('whoop_error');
            toast.error(detail ? `WHOOP error: ${decodeURIComponent(detail)}` : 'Failed to connect WHOOP. Please try again.');
            window.history.replaceState({}, '', '/settings');
        }
        if (params.get('google') === 'connected') {
            setGoogleConnected(true);
            toast.success('Google Health connected successfully!');
            window.history.replaceState({}, '', '/settings');
        } else if (params.get('google') === 'error') {
            toast.error('Failed to connect Google Health. Please try again.');
            window.history.replaceState({}, '', '/settings');
        }
    }, []);

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
    const [hiddenHabits, setHiddenHabits] = useState<string[]>(initialProfile?.hidden_habits || []);
    const [equipment, setEquipment] = useState<string[]>(initialProfile?.available_equipment || []);

    const handleThemeSelect = (themeKey: string) => {
        setCurrentTheme(themeKey);
        saveProfile({ user_id: userId, selected_theme: themeKey } as any).catch(() => {});
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
                hidden_habits: hiddenHabits,
                available_equipment: equipment,
                nutrition_targets: {
                    ...initialProfile?.nutrition_targets,
                    water: targets.habit_water,
                } as any,
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
            if (data.synced) { toast.success(`Synced: ${data.synced.join(', ')}`); setLastWhoopSync(new Date().toLocaleTimeString()); }
            else toast.error(data.error || 'Sync failed');
        } catch { toast.error('Sync failed'); }
        finally { setWhoopSyncing(false); }
    };

    const syncGoogle = async () => {
        setGoogleSyncing(true);
        try {
            const res = await fetch('/api/google-health/sync', { method: 'POST' });
            const data = await res.json();
            if (data.synced) toast.success(`Synced: ${data.synced.join(', ')}`);
            else toast.error(data.error || 'Sync failed');
        } catch { toast.error('Sync failed'); }
        finally { setGoogleSyncing(false); }
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

                {/* Training Path */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm">⚔️</span>
                        <h2 className="text-sm font-black uppercase tracking-widest">Training Path</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { key: 'hybrid', emoji: '⚔️', name: 'Hybrid', available: true },
                            { key: 'strength', emoji: '🛡️', name: 'Strength', available: true },
                            { key: 'endurance', emoji: '🏹', name: 'Endurance', available: true },
                            { key: 'mobility', emoji: '🧘', name: 'Mobility', available: true },
                        ].map(p => (
                            <button key={p.key} disabled={!p.available}
                                onClick={async () => {
                                    if (!p.available) return;
                                    await saveProfile({ user_id: userId, selected_path: p.key } as any);
                                    toast.success(`Path changed to ${p.name}`);
                                }}
                                className={`p-3 rounded-xl border-2 text-left transition ${
                                    initialProfile?.selected_path === p.key ? 'border-orange-500 bg-orange-500/10' :
                                    p.available ? 'border-zinc-700 bg-zinc-800 hover:border-zinc-600' :
                                    'border-zinc-800 bg-zinc-900 opacity-50 cursor-not-allowed'
                                }`}>
                                <div className="text-lg mb-1">{p.emoji}</div>
                                <div className="text-xs font-bold text-white">{p.name}</div>
                            </button>
                        ))}
                    </div>
                </div>

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
                        ].map(({ key, label, unit }) => {
                            const isHidden = hiddenHabits.includes(key);
                            return (
                            <div key={key} className={`flex items-center gap-3 ${isHidden ? 'opacity-40' : ''}`}>
                                <button
                                    onClick={() => setHiddenHabits(prev => prev.includes(key) ? prev.filter(h => h !== key) : [...prev, key])}
                                    className="p-1.5 rounded-lg hover:bg-zinc-800 transition"
                                    title={isHidden ? 'Show habit' : 'Hide habit'}
                                >
                                    {isHidden ? <EyeOff size={14} className="text-zinc-600" /> : <Eye size={14} className="text-zinc-400" />}
                                </button>
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest w-24 shrink-0">{label}</label>
                                <input
                                    type="number"
                                    value={targets[key]}
                                    onChange={e => setTargets(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                    disabled={isHidden}
                                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono text-sm disabled:text-zinc-600"
                                />
                                <span className="text-zinc-500 text-xs w-10">{unit}</span>
                            </div>
                            );
                        })}
                    </div>
                </div>

                {/* Equipment Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Dumbbell size={16} className="text-purple-400" />
                        <h2 className="text-sm font-black uppercase tracking-widest">Equipment</h2>
                    </div>
                    <p className="text-[10px] text-zinc-600 mb-4">Workouts adapt to what you have access to. Uncheck items when traveling.</p>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { id: 'barbell', label: 'Barbell', emoji: '🏋️' },
                            { id: 'dumbbells', label: 'Dumbbells', emoji: '💪' },
                            { id: 'kettlebells', label: 'Kettlebells', emoji: '🔔' },
                            { id: 'pull_up_bar', label: 'Pull-Up Bar', emoji: '🪜' },
                            { id: 'bench', label: 'Bench', emoji: '🪑' },
                            { id: 'squat_rack', label: 'Squat Rack', emoji: '🏗️' },
                            { id: 'smith_machine', label: 'Smith Machine', emoji: '🔩' },
                            { id: 'cables', label: 'Cable Machine', emoji: '🔗' },
                            { id: 'treadmill', label: 'Treadmill', emoji: '🏃' },
                            { id: 'rower', label: 'Rower', emoji: '🚣' },
                            { id: 'resistance_bands', label: 'Bands', emoji: '🔄' },
                            { id: 'box', label: 'Plyo Box', emoji: '📦' },
                            { id: 'outdoor_running', label: 'Outdoor Run', emoji: '🌳' },
                            { id: 'bodyweight_only', label: 'Bodyweight', emoji: '🙋' },
                        ].map(item => {
                            const selected = equipment.includes(item.id);
                            return (
                                <button key={item.id} onClick={() => setEquipment(prev => selected ? prev.filter(e => e !== item.id) : [...prev, item.id])}
                                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all text-xs ${selected ? 'border-purple-500/50 bg-purple-500/10 text-white' : 'border-zinc-800 bg-zinc-950 text-zinc-500'}`}>
                                    <span>{item.emoji}</span>
                                    <span className="font-bold">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Health Sync Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Link2 size={16} className="text-blue-400" />
                        <h2 className="text-sm font-black uppercase tracking-widest">Integrations</h2>
                    </div>
                    <p className="text-[10px] text-zinc-500 mb-4">Wearables sync to Health Connect every 15–30 min. For the latest reading, open your wearable&apos;s app then pull to refresh.</p>

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
                            <>
                            <div className="flex gap-2">
                                <button
                                    onClick={syncWhoop}
                                    disabled={whoopSyncing}
                                    className="flex-1 py-2.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition disabled:opacity-50"
                                >
                                    {whoopSyncing ? 'Syncing...' : 'Sync Now'}
                                </button>
                                <button
                                    onClick={() => { setWhoopConnected(false); }}
                                    className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-red-400 text-xs font-bold rounded-xl transition"
                                >
                                    Disconnect
                                </button>
                            </div>
                            {lastWhoopSync && <p className="text-[10px] text-zinc-600 mt-2 text-center">Last synced: {lastWhoopSync}</p>}
                            </>
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

                    {/* Google Health / Fitbit */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">💚</span>
                                <span className="text-sm font-bold text-white">Fitbit / Google Health</span>
                            </div>
                            {googleConnected && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Connected</span>}
                        </div>
                        <p className="text-zinc-500 text-xs mb-3">Auto-sync steps, sleep, calories, and weight from Fitbit or Pixel Watch.</p>
                        {googleConnected ? (
                            <button
                                onClick={syncGoogle}
                                disabled={googleSyncing}
                                className="w-full py-2.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition disabled:opacity-50"
                            >
                                {googleSyncing ? 'Syncing...' : 'Sync Now'}
                            </button>
                        ) : (
                            <a
                                href="/api/google-health/auth"
                                className="block w-full text-center py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition"
                            >
                                Connect Fitbit / Google
                            </a>
                        )}
                    </div>

                    <hr className="border-zinc-800 my-4" />

                    {/* Health Connect / Manual Sync */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📱</span>
                            <span className="text-sm font-bold text-white">Health Connect / Apple Health</span>
                        </div>
                        <p className="text-zinc-500 text-xs mb-3">Auto-sync steps, sleep, calories, and weight from your phone.</p>

                    {syncToken ? (
                        <div className="space-y-3">
                            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                                <span className="text-[10px] text-zinc-600 uppercase font-bold">Your Webhook URL</span>
                                <div className="flex gap-1.5 mt-1">
                                    <code className="flex-1 text-[11px] text-zinc-300 bg-zinc-900 px-2 py-1.5 rounded break-all">{typeof window !== 'undefined' ? `${window.location.origin}/api/sync/health-connect?token=${syncToken}` : ''}</code>
                                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/sync/health-connect?token=${syncToken}`); toast.success('URL copied!'); }} className="px-2 py-1 bg-zinc-800 rounded hover:bg-zinc-700 transition shrink-0 self-start">
                                        <Copy size={12} className="text-zinc-400" />
                                    </button>
                                </div>
                                <p className="text-zinc-600 text-[10px] mt-2">Paste this as the webhook URL in HC Webhook. No headers needed.</p>
                            </div>
                            <a
                                href="https://play.google.com/store/apps/details?id=com.hcwebhook.app"
                                target="_blank"
                                rel="noopener"
                                className="block w-full text-center py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition"
                            >
                                Get HC Webhook (Android)
                            </a>
                            <p className="text-zinc-600 text-[10px] text-center">Paste the URL above into HC Webhook → Webhooks. Select Steps, Sleep, Calories, Weight.</p>
                            <div className="flex gap-2">
                                <a href="/sync/setup" className="flex-1 text-center py-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition">
                                    Full Guide
                                </a>
                                <button onClick={generateSyncToken} disabled={generatingToken} className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition text-zinc-400 text-xs">
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

                {/* Reset Profile */}
                <div className="mt-8 pt-6 border-t border-zinc-800">
                    <button
                        onClick={async () => {
                            const input = window.prompt('This will delete ALL your data (workouts, habits, nutrition, body measurements, programs) and restart onboarding. Your account stays intact.\n\nType RESET to confirm:');
                            if (input?.trim().toUpperCase() !== 'RESET') return;
                            try {
                                const res = await fetch('/api/account/reset', { method: 'POST' });
                                if (res.ok) {
                                    localStorage.clear();
                                    window.location.href = '/dashboard';
                                } else {
                                    toast.error('Failed to reset profile');
                                }
                            } catch { toast.error('Failed to reset profile'); }
                        }}
                        className="w-full py-3 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-widest transition"
                    >
                        Reset Profile & Restart Onboarding
                    </button>
                    <p className="text-[10px] text-zinc-700 text-center mt-1">Wipes all data and restarts setup. Your account stays intact.</p>
                </div>

                {/* Delete Account */}
                <div className="mt-8 pt-6 border-t border-zinc-800">
                    <button
                        onClick={async () => {
                            if (!window.confirm('Are you sure you want to delete your account? This will permanently remove all your data including workouts, habits, nutrition logs, and body measurements. This cannot be undone.')) return;
                            if (!window.confirm('This is irreversible. Type DELETE to confirm... (tap OK to proceed)')) return;
                            try {
                                const res = await fetch('/api/account/delete', { method: 'DELETE' });
                                if (res.ok) {
                                    window.location.href = '/login';
                                } else {
                                    toast.error('Failed to delete account');
                                }
                            } catch { toast.error('Failed to delete account'); }
                        }}
                        className="w-full py-3 text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition"
                    >
                        Delete Account
                    </button>
                    <p className="text-[10px] text-zinc-700 text-center mt-1">Permanently deletes all your data. This cannot be undone.</p>
                </div>
            </div>
        </div>
    );
}
