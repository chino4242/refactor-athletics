"use client";

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

export function PixelBar({ current, max }: { current: number; max: number }) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const pct = Math.min((current / max) * 100, 100);

  return (
    <div className="h-3 bg-zinc-800 border border-zinc-700 flex">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 border-r border-zinc-900 ${i < Math.round(pct / 5) ? colors.barFill : ''}`}
        />
      ))}
    </div>
  );
}

export function ScreenWrapper({ children }: { children: React.ReactNode }) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);

  return (
    <div className={`min-h-screen ${colors.bgTint} pb-24 px-3 pt-4`}>
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-40" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${colors.scanline} 2px, ${colors.scanline} 4px)`
      }} />
      {children}
    </div>
  );
}
