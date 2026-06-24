"use client";

import { useEffect, useState } from 'react';
import { getV2Theme } from '@/data/v2themes';

// Streak phases
export const STREAK_PHASES = [
  { min: 1, max: 2, name: 'Spark', color: 'text-orange-400' },
  { min: 3, max: 6, name: 'Burning', color: 'text-orange-300' },
  { min: 7, max: 13, name: 'Forged', color: 'text-amber-300' },
  { min: 14, max: 29, name: 'Relentless', color: 'text-yellow-300' },
  { min: 30, max: 9999, name: 'Eternal', color: 'text-cyan-300' },
];

export function getStreakPhase(streak: number) {
  return STREAK_PHASES.find(p => streak >= p.min && streak <= p.max) || STREAK_PHASES[0];
}

// Creature narrator lines keyed by state
const NARRATOR_LINES: Record<string, Record<string, string[]>> = {
  samurai: {
    morning: ['Your body remembers yesterday. Let it guide today.', 'The weight room is patient. It will wait for you.', 'Dawn and discipline. Show me which comes first.'],
    threshold: ['Today counted. I felt every rep.', 'You earned this rest. Tomorrow we go again.', 'The work is done. That is enough.'],
    streak_high: ['Fourteen days. Your hands don\'t shake anymore.', 'Consistency carved this. Not talent.', 'They\'ll never understand what this costs you.'],
    missed: ['You\'re here. That\'s the only thing that matters.', 'One still day. The blade doesn\'t rust overnight.', 'No judgment. Just begin.'],
    dormancy: ['My grip loosens when you don\'t train me.', 'It\'s been weeks. I\'m losing what we built.', 'Come back to this one. Before I forget how strong you are.'],
    pr: ['Heavier than last time. I noticed.', 'That weight used to own you. Not anymore.', 'New ceiling. You built that with your hands.'],
    idle: ['Quiet afternoon. The body is still processing.', 'Rest between efforts is still effort.', 'I\'m here when you\'re ready.'],
  },
  dragon: {
    morning: ['The iron is cold. Go warm it.', 'Another dawn. What will you feed me today?', 'I can feel you planning something. Good.'],
    threshold: ['Fed and full. Today was not wasted.', 'That\'s the day claimed. I grow when you grow.', 'Enough done. Even dragons rest.'],
    streak_high: ['Unbroken. I\'ve stopped counting — you won\'t stop.', 'This streak has weight now. Others would have quit.', 'The fire doesn\'t flicker anymore. It roars.'],
    missed: ['One cold night changes nothing.', 'You came back. That\'s all I needed to see.', 'Silence yesterday. Movement today. Acceptable.'],
    dormancy: ['My scales dull without this. Don\'t let me fade.', 'This exercise built me. Don\'t abandon it now.', 'I\'m weaker here than I was. Fix it.'],
    pr: ['Heavier. Faster. I felt the ground shake.', 'You just broke what used to break you.', 'New record. The old one wasn\'t worthy of you.'],
    idle: ['Digesting yesterday\'s effort. Growing from it.', 'Still afternoon. The work echoes.', 'Patience. Not everything needs fire.'],
  },
};

// Fallback for themes without specific lines
function getLines(theme: string, state: string): string[] {
  return NARRATOR_LINES[theme]?.[state] || NARRATOR_LINES['samurai'][state] || ['...'];
}

function pickLine(lines: string[]): string {
  // Deterministic within the hour so it doesn't change on every render
  const hourSeed = new Date().getHours() + new Date().getDate();
  return lines[hourSeed % lines.length];
}

interface CreatureNarratorProps {
  theme: string;
  streak: number;
  todayXp: number;
  dailyTarget: number;
  hasPrToday: boolean;
  missedYesterday: boolean;
  expiringCount: number;
  colors: ReturnType<typeof getV2Theme>;
}

export default function CreatureNarrator({ theme, streak, todayXp, dailyTarget, hasPrToday, missedYesterday, expiringCount, colors }: CreatureNarratorProps) {
  // Determine which creature to show (use first allied exercise sprite)
  const creatureTheme = theme === 'athlete' ? 'samurai' : theme;
  const spritePath = `/enemies/${creatureTheme === 'dragon' ? 'dragon' : 'samurai'}/back_squat_t1.png`;

  // Determine narrative state priority
  let state = 'idle';
  const hour = new Date().getHours();

  if (hasPrToday) state = 'pr';
  else if (todayXp >= dailyTarget && dailyTarget > 0) state = 'threshold';
  else if (missedYesterday && todayXp === 0) state = 'missed';
  else if (expiringCount > 0 && todayXp === 0) state = 'dormancy';
  else if (streak >= 14) state = 'streak_high';
  else if (hour < 12 && todayXp === 0) state = 'morning';

  const line = pickLine(getLines(creatureTheme, state));
  const phase = streak > 0 ? getStreakPhase(streak) : null;

  return (
    <div className="flex items-center gap-2 mb-3 px-1">
      <img
        src={spritePath}
        alt=""
        className="w-6 h-6 object-contain"
        style={{ imageRendering: 'pixelated' }}
      />
      <p className="text-[9px] text-zinc-400 italic leading-tight flex-1">&ldquo;{line}&rdquo;</p>
      {phase && (
        <span className={`text-[8px] ${phase.color} whitespace-nowrap`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          🔥 {phase.name}
        </span>
      )}
    </div>
  );
}
