"use client";

import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

interface Props {
  questName: string;
  onDismiss: () => void;
}

const RALLY_LINES: Record<string, { title: string; quote: string; cta: string }> = {
  samurai: {
    title: 'THE BLADE WAS STAYED',
    quote: '"A samurai does not count falls. They count the times they rise."',
    cta: 'Honor demands we try again.',
  },
  dragon: {
    title: 'THE FLAME FALTERED',
    quote: '"Even dragons rest between eruptions. The fire never dies — it rebuilds."',
    cta: 'We burn brighter next time.',
  },
  viking: {
    title: 'THE SHIELD WALL BROKE',
    quote: '"In Valhalla, they do not ask if you won. They ask if you fought."',
    cta: 'We raid again at dawn.',
  },
  dinosaur: {
    title: 'THE HUNT FAILED',
    quote: '"The pack regroups. The prey doesn\'t get lucky twice."',
    cta: 'Sharpen. Adapt. Strike again.',
  },
  athlete: {
    title: 'QUEST INCOMPLETE',
    quote: '"Setbacks are setups for comebacks."',
    cta: "We go again.",
  },
};

export default function GuildQuestRally({ questName, onDismiss }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const rally = RALLY_LINES[currentTheme] || RALLY_LINES.athlete;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center" onClick={onDismiss}>
      <div className="absolute inset-0 bg-black/95" />
      <div className="relative text-center space-y-5 px-8 max-w-sm w-full animate-in fade-in zoom-in duration-500" onClick={e => e.stopPropagation()}>
        {/* Status icon */}
        <div className="w-16 h-16 mx-auto border-2 border-red-800 bg-red-950/30 rounded-full flex items-center justify-center">
          <span className="text-3xl">⚔</span>
        </div>

        {/* Title */}
        <p className="text-[10px] text-red-400 uppercase tracking-widest" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {rally.title}
        </p>

        {/* Quest name */}
        <p className="text-sm text-white font-medium">{questName}</p>

        {/* Rally quote */}
        <p className="text-[11px] text-zinc-400 italic leading-relaxed px-4">
          {rally.quote}
        </p>

        {/* CTA */}
        <div className="pt-4">
          <p className={`text-[10px] ${colors.secondary} uppercase tracking-wider`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {rally.cta}
          </p>
        </div>

        {/* Dismiss */}
        <button onClick={onDismiss} className={`mt-6 px-6 py-2 border ${colors.primary} bg-zinc-900`}>
          <span className="text-[9px] text-white uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Let&apos;s go
          </span>
        </button>
      </div>
    </div>
  );
}
