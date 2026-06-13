"use client";

import { useState, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

interface PixelBoxProps {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
}

export default function PixelBox({ children, className = '', highlight = false }: PixelBoxProps) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);

  return (
    <div className={`relative border-2 ${highlight ? colors.primary : colors.border} bg-zinc-900/95 rounded-sm shadow-[inset_0_0_0_2px_#18181b,inset_0_0_0_4px_#27272a] ${className}`}>
      <div className={`absolute -top-[3px] -left-[3px] w-[6px] h-[6px] ${colors.corner}`} />
      <div className={`absolute -top-[3px] -right-[3px] w-[6px] h-[6px] ${colors.corner}`} />
      <div className={`absolute -bottom-[3px] -left-[3px] w-[6px] h-[6px] ${colors.corner}`} />
      <div className={`absolute -bottom-[3px] -right-[3px] w-[6px] h-[6px] ${colors.corner}`} />
      {children}
    </div>
  );
}

export function PixelBar({ current, max, inverted }: { current: number; max: number; inverted?: boolean }) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const pct = inverted
    ? Math.max(((max - current) / max) * 100, 0) // HP remaining (drains as current increases)
    : Math.min((current / max) * 100, 100);

  // Color stages for inverted (enemy HP)
  let fillClass = colors.barFill;
  if (inverted) {
    if (pct <= 25) fillClass = 'bg-red-500 animate-pulse';
    else if (pct <= 50) fillClass = 'bg-orange-500';
    else if (pct <= 75) fillClass = 'bg-yellow-500';
  }

  return (
    <div className="h-3 bg-zinc-800 border border-zinc-700 flex">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 border-r border-zinc-900 ${i < Math.round(pct / 5) ? fillClass : ''}`}
        />
      ))}
    </div>
  );
}

export function ScreenWrapper({ children, onRefresh }: { children: React.ReactNode; onRefresh?: () => Promise<void> }) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!onRefresh || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 60 && window.scrollY === 0) setPulling(true);
    else setPulling(false);
  };
  const handleTouchEnd = async () => {
    if (pulling && onRefresh && !refreshing) {
      setPulling(false);
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPulling(false);
  };

  return (
    <div
      className={`min-h-screen ${colors.bgTint} pb-24 px-3 pt-4`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {(pulling || refreshing) && (
        <div className="flex justify-center py-2 -mt-2 mb-2">
          <span className={`text-[8px] ${colors.secondary} ${refreshing ? 'animate-pulse' : ''}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {refreshing ? 'SYNCING...' : '↓ RELEASE TO REFRESH'}
          </span>
        </div>
      )}
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-40" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${colors.scanline} 2px, ${colors.scanline} 4px)`
      }} />
      {children}
    </div>
  );
}
