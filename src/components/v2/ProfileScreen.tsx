"use client";

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme, getThemeIdentity } from '@/data/v2themes';
import PixelBox, { ScreenWrapper } from './PixelBox';
import { signout } from '@/app/login/actions';
import Link from 'next/link';

interface Props {
  userId: string;
  displayName: string;
  age: number;
  sex: string;
  currentWeight: number;
  currentTheme: string;
}

export default function ProfileScreen({ userId, displayName, age, sex, currentWeight, currentTheme: initialTheme }: Props) {
  const { currentTheme, setCurrentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const identity = getThemeIdentity(currentTheme);
  const [stats, setStats] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.from('users').select('selected_path').eq('id', userId).single();

      // Get basic stats
      const [{ count: workoutCount }, { count: exerciseCount }] = await Promise.all([
        supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('workouts').select('exercise_id', { count: 'exact', head: true }).eq('user_id', userId).gt('level', 0),
      ]);

      const { getPowerLevelV2 } = await import('@/services/powerLevelV2');
      const pl = await getPowerLevelV2(userId);

      setStats({ path: data?.selected_path || 'hybrid', powerLevel: pl.powerLevel, workouts: workoutCount || 0, ranked: exerciseCount || 0 });
    })();
  }, [userId]);

  const THEMES_LIST = [
    { key: 'athlete', emoji: '🏟️', name: 'Athlete' },
    { key: 'dragon', emoji: '🐉', name: 'Draconic' },
    { key: 'samurai', emoji: '⛩️', name: 'Samurai' },
    { key: 'dinosaur', emoji: '🦖', name: 'Apex' },
    { key: 'viking', emoji: '⚡', name: 'Viking' },
  ];

  const handleThemeChange = async (themeKey: string) => {
    setCurrentTheme(themeKey);
    const { saveProfile } = await import('@/services/api');
    await saveProfile({ user_id: userId, selected_theme: themeKey } as any);
  };

  return (
    <ScreenWrapper>
      {/* Banner + Identity */}
      <div className="mb-4 overflow-hidden border-2 border-zinc-800 rounded-sm relative">
        <img src={`/themes/${currentTheme}/v2/banner.png`} alt="" className="w-full h-auto opacity-60" style={{ imageRendering: 'pixelated' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a12] via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3">
          <p className="text-sm text-white font-bold">{displayName}</p>
          <p className="text-[8px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>{identity.emoji} {identity.name} PATH</p>
        </div>
      </div>

      {/* Stats */}
      <PixelBox className="p-4 mb-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{stats?.powerLevel || 0}</p>
            <p className="text-[7px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>POWER</p>
          </div>
          <div>
            <p className="text-lg text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{stats?.ranked || 0}</p>
            <p className="text-[7px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>RANKED</p>
          </div>
          <div>
            <p className="text-lg text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{currentWeight}</p>
            <p className="text-[7px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>LBS</p>
          </div>
          <div>
            <p className="text-lg text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{stats?.workouts || 0}</p>
            <p className="text-[7px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>LOGS</p>
          </div>
        </div>
      </PixelBox>

      {/* Theme Picker */}
      <PixelBox className="p-4 mb-4">
        <p className={`text-[9px] ${colors.headerText} mb-3 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>THEME</p>
        <div className="flex gap-2">
          {THEMES_LIST.map(t => (
            <button
              key={t.key}
              onClick={() => handleThemeChange(t.key)}
              className={`flex-1 py-2 border text-center ${currentTheme === t.key ? `${colors.primary} bg-zinc-800` : 'border-zinc-700 bg-zinc-900'}`}
            >
              <span className="text-lg">{t.emoji}</span>
              <p className={`text-[7px] mt-0.5 ${currentTheme === t.key ? colors.secondary : 'text-zinc-500'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{t.name}</p>
            </button>
          ))}
        </div>
      </PixelBox>

      {/* Settings Links */}
      <PixelBox className="p-4 mb-4">
        <p className={`text-[9px] ${colors.headerText} mb-3 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>SETTINGS</p>
        <div className="space-y-1">
          <button
            onClick={async () => {
              localStorage.removeItem('health_permission_denied');
              localStorage.removeItem('last_health_sync');
              localStorage.removeItem('health_sync_in_progress');
              const { requestPermissions } = await import('@/services/nativeHealth');
              await requestPermissions();
              alert('✓ Health sync reset. Return to home to sync.');
            }}
            className={`w-full flex items-center justify-between px-2 py-2 border ${colors.border} bg-zinc-800/50 hover:bg-zinc-800 transition-colors`}
          >
            <span className="text-[8px] text-zinc-300" style={{ fontFamily: "var(--font-pixel), monospace" }}>RECONNECT HEALTH SYNC</span>
            <span className="text-zinc-600 text-xs">⟲</span>
          </button>
          <Link href="/settings" className={`flex items-center justify-between px-2 py-2 border ${colors.border} bg-zinc-800/50 hover:bg-zinc-800 transition-colors`}>
            <span className="text-[8px] text-zinc-300" style={{ fontFamily: "var(--font-pixel), monospace" }}>INTEGRATIONS & EQUIPMENT</span>
            <span className="text-zinc-600 text-xs">▸</span>
          </Link>
          <Link href="/privacy" className={`flex items-center justify-between px-2 py-2 border ${colors.border} bg-zinc-800/50 hover:bg-zinc-800 transition-colors`}>
            <span className="text-[8px] text-zinc-300" style={{ fontFamily: "var(--font-pixel), monospace" }}>PRIVACY POLICY</span>
            <span className="text-zinc-600 text-xs">▸</span>
          </Link>
          <Link href="/debug/health" className={`flex items-center justify-between px-2 py-2 border ${colors.border} bg-zinc-800/50 hover:bg-zinc-800 transition-colors`}>
            <span className="text-[8px] text-zinc-300" style={{ fontFamily: "var(--font-pixel), monospace" }}>🔧 HEALTH DEBUG</span>
            <span className="text-zinc-600 text-xs">▸</span>
          </Link>
          <Link href="/terms" className={`flex items-center justify-between px-2 py-2 border ${colors.border} bg-zinc-800/50 hover:bg-zinc-800 transition-colors`}>
            <span className="text-[8px] text-zinc-300" style={{ fontFamily: "var(--font-pixel), monospace" }}>TERMS OF SERVICE</span>
            <span className="text-zinc-600 text-xs">▸</span>
          </Link>
        </div>
      </PixelBox>

      {/* Account */}
      <PixelBox className="p-4 mb-4">
        <p className={`text-[9px] ${colors.headerText} mb-3 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>ACCOUNT</p>
        <div className="space-y-2">
          <button
            onClick={() => signout()}
            className={`w-full px-2 py-2 border ${colors.border} bg-zinc-800/50 text-left hover:bg-zinc-800 transition-colors`}
          >
            <span className="text-[8px] text-zinc-300" style={{ fontFamily: "var(--font-pixel), monospace" }}>SIGN OUT</span>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-2 py-2 border border-red-900/50 bg-zinc-800/50 text-left hover:bg-red-950/30 transition-colors"
          >
            <span className="text-[8px] text-red-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>DELETE ACCOUNT</span>
          </button>
        </div>
      </PixelBox>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className={`border-2 border-red-800 bg-zinc-900 p-6 max-w-xs w-full text-center`}>
            <p className="text-[10px] text-red-400 mb-4" style={{ fontFamily: "var(--font-pixel), monospace" }}>DELETE ACCOUNT?</p>
            <p className="text-xs text-zinc-500 mb-4">This permanently removes all your data. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className={`flex-1 py-3 border ${colors.border} bg-zinc-800 text-zinc-300 text-[9px]`} style={{ fontFamily: "var(--font-pixel), monospace" }}>CANCEL</button>
              <button onClick={async () => { await fetch('/api/account/delete', { method: 'DELETE' }); signout(); }} className="flex-1 py-3 border border-red-800 bg-zinc-800 text-red-400 text-[9px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>DELETE</button>
            </div>
          </div>
        </div>
      )}
    </ScreenWrapper>
  );
}
