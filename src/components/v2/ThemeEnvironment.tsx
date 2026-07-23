"use client";

/**
 * ThemeEnvironment — Atmospheric background layer for vibrant mode.
 *
 * Blends:
 * - Subtle repeating texture (4-5% opacity)
 * - Ambient radial color wash from corners
 * - Atmospheric SVG illustration (theme-specific silhouette)
 * - Designed to sit BEHIND content at the screen level
 *
 * Usage: wrap your screen content or place inside ScreenWrapper
 * <ThemeEnvironment><children /></ThemeEnvironment>
 */

import { useTheme } from '@/context/ThemeContext';

// Each theme's environment config
const ENVIRONMENTS: Record<string, {
  wash: string;        // radial gradient wash
  texture: string;     // CSS background pattern
  silhouette: React.ReactNode; // SVG atmospheric element
}> = {
  samurai: {
    wash: 'radial-gradient(ellipse at 15% 10%, rgba(236,72,153,0.06) 0%, transparent 50%), radial-gradient(ellipse at 85% 90%, rgba(99,102,241,0.04) 0%, transparent 50%)',
    texture: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 10 Q32 15 30 20 Q28 15 30 10Z' fill='%23ec4899' opacity='0.04'/%3E%3Cpath d='M10 40 Q12 45 10 50 Q8 45 10 40Z' fill='%23ec4899' opacity='0.03'/%3E%3Cpath d='M50 35 Q52 40 50 45 Q48 40 50 35Z' fill='%23ec4899' opacity='0.03'/%3E%3C/svg%3E")`,
    silhouette: (
      <svg viewBox="0 0 400 60" className="w-full h-auto opacity-[0.04]" preserveAspectRatio="xMidYMax slice">
        {/* Torii gate silhouette + mountain + falling petals */}
        <path d="M0 60 L0 40 Q50 25 100 35 Q150 20 200 30 Q250 15 300 28 Q350 22 400 35 L400 60Z" fill="#ec4899" />
        {/* Torii gate */}
        <rect x="170" y="20" width="4" height="40" fill="#6366f1" opacity="0.6" />
        <rect x="226" y="20" width="4" height="40" fill="#6366f1" opacity="0.6" />
        <rect x="165" y="18" width="70" height="4" fill="#6366f1" opacity="0.6" rx="1" />
        <rect x="168" y="28" width="64" height="3" fill="#6366f1" opacity="0.4" rx="1" />
        {/* Petals */}
        <circle cx="80" cy="15" r="2" fill="#ec4899" opacity="0.5" />
        <circle cx="120" cy="25" r="1.5" fill="#ec4899" opacity="0.4" />
        <circle cx="300" cy="12" r="2" fill="#ec4899" opacity="0.5" />
        <circle cx="340" cy="30" r="1.5" fill="#ec4899" opacity="0.3" />
        <circle cx="50" cy="35" r="1" fill="#ec4899" opacity="0.4" />
      </svg>
    ),
  },
  dragon: {
    wash: 'radial-gradient(ellipse at 20% 15%, rgba(239,68,68,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 85%, rgba(249,115,22,0.04) 0%, transparent 50%)',
    texture: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='1' fill='%23ef4444' opacity='0.04'/%3E%3Ccircle cx='10' cy='10' r='0.5' fill='%23f97316' opacity='0.03'/%3E%3C/svg%3E")`,
    silhouette: (
      <svg viewBox="0 0 400 60" className="w-full h-auto opacity-[0.04]" preserveAspectRatio="xMidYMax slice">
        {/* Volcanic mountain silhouette with ember particles */}
        <path d="M0 60 L0 45 Q60 30 120 38 Q180 10 220 25 Q260 8 300 30 Q350 25 400 40 L400 60Z" fill="#ef4444" />
        {/* Embers */}
        <circle cx="100" cy="20" r="1.5" fill="#f97316" opacity="0.6" />
        <circle cx="200" cy="10" r="1" fill="#fbbf24" opacity="0.5" />
        <circle cx="300" cy="18" r="1.5" fill="#f97316" opacity="0.4" />
        <circle cx="150" cy="30" r="1" fill="#fbbf24" opacity="0.3" />
        <circle cx="350" cy="25" r="1" fill="#ef4444" opacity="0.5" />
      </svg>
    ),
  },
  viking: {
    wash: 'radial-gradient(ellipse at 10% 20%, rgba(56,189,248,0.05) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(6,182,212,0.04) 0%, transparent 50%)',
    texture: `url("data:image/svg+xml,%3Csvg width='50' height='50' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M25 5 L26 8 L25 7 L24 8Z' fill='%2338bdf8' opacity='0.03'/%3E%3Cpath d='M10 30 L11 33 L10 32 L9 33Z' fill='%2338bdf8' opacity='0.02'/%3E%3C/svg%3E")`,
    silhouette: (
      <svg viewBox="0 0 400 60" className="w-full h-auto opacity-[0.04]" preserveAspectRatio="xMidYMax slice">
        {/* Nordic mountains + aurora suggestion */}
        <path d="M0 60 L0 40 Q40 30 80 38 Q120 15 160 25 Q200 10 240 22 Q280 18 320 30 Q360 25 400 35 L400 60Z" fill="#38bdf8" />
        {/* Snowflakes */}
        <circle cx="60" cy="15" r="1" fill="white" opacity="0.3" />
        <circle cx="150" cy="20" r="0.8" fill="white" opacity="0.2" />
        <circle cx="280" cy="12" r="1" fill="white" opacity="0.3" />
        <circle cx="350" cy="22" r="0.8" fill="white" opacity="0.2" />
      </svg>
    ),
  },
  dinosaur: {
    wash: 'radial-gradient(ellipse at 15% 80%, rgba(16,185,129,0.05) 0%, transparent 50%), radial-gradient(ellipse at 85% 20%, rgba(245,158,11,0.04) 0%, transparent 50%)',
    texture: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 50 Q30 45 32 42 Q30 40 28 42 Q30 45 30 50Z' fill='%2322c55e' opacity='0.03'/%3E%3C/svg%3E")`,
    silhouette: (
      <svg viewBox="0 0 400 60" className="w-full h-auto opacity-[0.04]" preserveAspectRatio="xMidYMax slice">
        {/* Jungle canopy silhouette */}
        <path d="M0 60 L0 35 Q30 25 60 32 Q90 20 120 28 Q150 15 180 25 Q210 18 240 30 Q270 12 300 22 Q330 18 360 28 Q380 22 400 30 L400 60Z" fill="#22c55e" />
        {/* Leaves/vines */}
        <path d="M50 20 Q55 15 60 20" stroke="#22c55e" strokeWidth="1.5" fill="none" opacity="0.3" />
        <path d="M320 15 Q325 10 330 15" stroke="#22c55e" strokeWidth="1.5" fill="none" opacity="0.3" />
      </svg>
    ),
  },
  athlete: {
    wash: 'radial-gradient(ellipse at 20% 20%, rgba(249,115,22,0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(245,158,11,0.03) 0%, transparent 50%)',
    texture: 'none',
    silhouette: null,
  },
};

export default function ThemeEnvironment({ children }: { children: React.ReactNode }) {
  const { currentTheme } = useTheme();
  const env = ENVIRONMENTS[currentTheme] || ENVIRONMENTS.athlete;

  return (
    <div className="relative">
      {/* Ambient wash layer */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{ background: env.wash }}
      />

      {/* Texture layer */}
      {env.texture !== 'none' && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{ backgroundImage: env.texture, backgroundRepeat: 'repeat' }}
        />
      )}

      {/* Silhouette illustration — fixed at top */}
      {env.silhouette && (
        <div className="absolute top-0 left-0 right-0 pointer-events-none z-0 overflow-hidden">
          {env.silhouette}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
