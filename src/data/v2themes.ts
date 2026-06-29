/** v2 Theme color system — drives the entire app's accent colors in SNES style */

export interface V2ThemeColors {
  /** Primary accent (borders, highlights, active states) */
  primary: string;
  /** Secondary accent (text highlights, badges) */
  secondary: string;
  /** Background tint for the main screen */
  bgTint: string;
  /** PixelBox border color */
  border: string;
  /** PixelBox corner dot color */
  corner: string;
  /** Progress bar fill */
  barFill: string;
  /** Header/label text color */
  headerText: string;
  /** Scanline overlay color */
  scanline: string;
  /** Nav active tab background */
  navActive: string;
  /** Box-shadow glow for active elements */
  glow: string;
}

export const V2_THEMES: Record<string, V2ThemeColors> = {
  athlete: {
    primary: 'border-zinc-500',
    secondary: 'text-zinc-200',
    bgTint: 'bg-[#0a0a12]',
    border: 'border-zinc-600',
    corner: 'bg-zinc-400',
    barFill: 'bg-zinc-300',
    headerText: 'text-zinc-400',
    scanline: 'rgba(255,255,255,0.05)',
    navActive: 'bg-zinc-800/50',
    glow: '0 0 20px 2px rgba(255,255,255,0.10), inset 0 0 15px rgba(255,255,255,0.03)',
  },
  dragon: {
    primary: 'border-red-800',
    secondary: 'text-red-400',
    bgTint: 'bg-[#0f0808]',
    border: 'border-red-900/60',
    corner: 'bg-red-500',
    barFill: 'bg-red-500',
    headerText: 'text-red-400',
    scanline: 'rgba(239,68,68,0.04)',
    navActive: 'bg-red-950/50',
    glow: '0 0 20px 2px rgba(239,68,68,0.15), inset 0 0 15px rgba(239,68,68,0.05)',
  },
  samurai: {
    primary: 'border-indigo-700',
    secondary: 'text-pink-400',
    bgTint: 'bg-[#080810]',
    border: 'border-indigo-900/60',
    corner: 'bg-pink-500',
    barFill: 'bg-indigo-500',
    headerText: 'text-pink-400',
    scanline: 'rgba(236,72,153,0.04)',
    navActive: 'bg-indigo-950/50',
    glow: '0 0 20px 2px rgba(236,72,153,0.15), inset 0 0 15px rgba(236,72,153,0.05)',
  },
  dinosaur: {
    primary: 'border-green-800',
    secondary: 'text-green-400',
    bgTint: 'bg-[#080f08]',
    border: 'border-green-900/60',
    corner: 'bg-amber-500',
    barFill: 'bg-green-500',
    headerText: 'text-green-400',
    scanline: 'rgba(16,185,129,0.04)',
    navActive: 'bg-green-950/50',
    glow: '0 0 20px 2px rgba(245,158,11,0.15), inset 0 0 15px rgba(245,158,11,0.05)',
  },
  viking: {
    primary: 'border-sky-800',
    secondary: 'text-sky-300',
    bgTint: 'bg-[#08090f]',
    border: 'border-sky-900/60',
    corner: 'bg-sky-400',
    barFill: 'bg-sky-500',
    headerText: 'text-sky-300',
    scanline: 'rgba(6,182,212,0.04)',
    navActive: 'bg-sky-950/50',
    glow: '0 0 20px 2px rgba(6,182,212,0.15), inset 0 0 15px rgba(6,182,212,0.05)',
  },
};

/** Map the existing theme keys to v2 keys */
export function getV2Theme(themeKey: string): V2ThemeColors {
  return V2_THEMES[themeKey] || V2_THEMES.athlete;
}

export const THEME_IDENTITY: Record<string, { emoji: string; name: string }> = {
  dragon: { emoji: '🐉', name: 'Draconic' },
  samurai: { emoji: '⛩️', name: 'Samurai' },
  viking: { emoji: '⚡', name: 'Viking' },
  dinosaur: { emoji: '🦖', name: 'Apex Predator' },
  athlete: { emoji: '🏟️', name: 'Athlete' },
};

export function getThemeIdentity(themeKey: string) {
  return THEME_IDENTITY[themeKey] || THEME_IDENTITY.athlete;
}

export const DEVOTION_NAMES: Record<string, { label: string; icon: string; levelUp: string }> = {
  dragon: { label: 'Hoard', icon: '🔥', levelUp: 'Your hoard grows' },
  samurai: { label: 'Legacy', icon: '⚔️', levelUp: 'Your legacy deepens' },
  viking: { label: 'Saga', icon: 'ᚱ', levelUp: 'Another verse in your saga' },
  dinosaur: { label: 'Lineage', icon: '🐾', levelUp: 'The lineage strengthens' },
  athlete: { label: 'Legacy', icon: '★', levelUp: 'Your legacy grows' },
};

export function getDevotionName(themeKey: string) {
  return DEVOTION_NAMES[themeKey] || DEVOTION_NAMES.athlete;
}
