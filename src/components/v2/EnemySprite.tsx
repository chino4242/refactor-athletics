"use client";

import { useState, useEffect, useRef } from 'react';

interface BattleCard {
  id: string;
  name: string;
  exerciseId: string;
  type: 'lifting' | 'duration' | 'cardio';
  totalSets: number;
  completedSets: number;
  targetReps: number;
  targetSeconds?: number;
  intervals?: { zone: string; seconds: number; color: string; note?: string }[];
  exercises?: { name: string; exerciseId: string; targetReps: number }[];
  defeated: boolean;
  poofing: boolean;
  section?: string;
  catalogItem?: any;
  lastWeight?: number;
  bestValue?: number;
  lastThree?: number[];
  currentLevel?: number;
  threatLevel?: 'guardian' | 'trickster' | 'titan' | 'spark';
}

export const ENEMY_NAMES: Record<string, Record<string, string>> = {
  samurai: {
    back_squat: 'Crimson Oni', deadlift: 'Earth Yokai', bench_press: 'Haunted Armor',
    pull_up: 'Tengu', overhead_press: 'Thunder Oni', run_1_mile: 'Fox Spirit',
    plank: 'Stone Kappa', push_ups: 'Shadow Ninjas', run_400m: 'Kunai Volley',
    dead_hang: 'Chain Spirit', barbell_row: 'Kraken Tentacle', run_5k: 'Wind Kami',
  },
  dragon: {
    back_squat: 'Molten Golem', deadlift: 'Iron Wyrm', bench_press: 'Fire Shield',
    pull_up: 'Sky Drake', overhead_press: 'Thunder Dragon', run_1_mile: 'Wind Serpent',
    plank: 'Lava Tortoise', push_ups: 'Fire Sprites', run_400m: 'Lightning Drake',
    dead_hang: 'Gravity Phantom', barbell_row: 'Deep Wyrm', run_5k: 'Storm Dragon',
  },
};

export const CREATURE_DIALOGUE: Record<string, Record<string, { idle: string[]; hit: string[]; nearDefeat: string; defeated: string }>> = {
  samurai: {
    back_squat: { idle: ['The Oni cracks its knuckles. Waiting.', 'It watches you warm up. Unimpressed.'], hit: ['The Oni grunts. It felt that.', 'A worthy strike. The Oni staggers.'], nearDefeat: 'The Oni is breathing hard. One more.', defeated: 'The Oni bows — barely. "Took you long enough."' },
    deadlift: { idle: ['The Earth Yokai rises from the ground. Slowly.', 'Stone grinds against stone. It stirs.'], hit: ['Cracks form across its body.', 'The Yokai crumbles at the edges.'], nearDefeat: 'It\'s barely holding together. Finish it.', defeated: 'The Earth Yokai sinks back into the ground. Respect earned.' },
    bench_press: { idle: ['The Haunted Armor hovers. Silent. Waiting.', 'Ghost light flickers inside the visor.'], hit: ['The armor dents. A gauntlet drops.', 'Spectral energy leaks from the impact.'], nearDefeat: 'The armor is losing cohesion. One more strike.', defeated: 'The armor crashes to the ground. The ghost within nods.' },
    pull_up: { idle: ['The Tengu perches above. Looking down.', '"You again," it sneers.'], hit: ['The Tengu\'s wings falter.', 'It drops a few feet. Pride wounded.'], nearDefeat: '"Fine. FINE. One more and I yield."', defeated: 'The Tengu folds its wings. It has nothing left to teach you here.' },
    overhead_press: { idle: ['Thunder rumbles. The Oni drums overhead.', 'Lightning crackles between its horns.'], hit: ['The storm wavers.', 'Its drums skip a beat.'], nearDefeat: 'The thunder is fading. Press through.', defeated: 'The Thunder Oni lowers its drums. The sky clears.' },
    run_1_mile: { idle: ['The Fox Spirit paces. Tails swishing.', '"Catch me if you can," it grins.'], hit: ['You\'re gaining on it.', 'The Fox glances back. Surprised.'], nearDefeat: 'It\'s within reach. Don\'t slow down.', defeated: 'The Fox Spirit stops running. "Well. That was fun."' },
    plank: { idle: ['The Stone Kappa sits. Immovable.', '"I can do this forever. Can you?"'], hit: ['A crack appears.', 'The Kappa shifts. Slightly.'], nearDefeat: '"You\'re still here? ...Impressive."', defeated: 'The Kappa tips its head. Water spills. It yields.' },
    push_ups: { idle: ['Shadows gather. Eyes multiply.', 'The ninjas watch from every angle.'], hit: ['One shadow dissipates.', 'The formation breaks slightly.'], nearDefeat: 'Only a few remain. Finish them.', defeated: 'The shadows scatter. They\'ll regroup... but not today.' },
    run_400m: { idle: ['Steel glints in the air. The volley is ready.', 'Kunai hover. Waiting for you to move.'], hit: ['Blades deflected.', 'The volley thins.'], nearDefeat: 'Almost through the storm.', defeated: 'The last kunai falls. Clear path ahead.' },
    dead_hang: { idle: ['Chains rattle. The spirit hangs above.', '"Let go," it whispers. "Everyone does."'], hit: ['The chains loosen.', '"Still here?" it asks, genuinely surprised.'], nearDefeat: '"You... won\'t... let go?"', defeated: 'The Chain Spirit dissolves. The chains fall silent.' },
    barbell_row: { idle: ['A tentacle emerges from below. Then another.', 'The depths stir. Something massive waits.'], hit: ['The tentacle recoils.', 'Ink sprays. You struck something vital.'], nearDefeat: 'The kraken eye appears. It\'s retreating.', defeated: 'The tentacles withdraw. The deep is quiet... for now.' },
    run_5k: { idle: ['The wind takes shape. A face forms in the gust.', 'The Wind Kami swirls. Patient. Eternal.'], hit: ['The wind falters.', 'Leaves scatter as you push through.'], nearDefeat: 'The gale is weakening. You\'re cutting through.', defeated: 'The wind stills. The Kami dissolves into cherry blossoms.' },
  },
  dragon: {
    back_squat: { idle: ['Magma bubbles beneath the Golem\'s skin.', 'It watches through molten eyes. Unblinking.'], hit: ['Obsidian cracks. Heat escapes.', 'The Golem lurches. You felt the ground shake.'], nearDefeat: 'Lava pours from its wounds. It\'s weakening.', defeated: 'The Golem hardens to stone. Still warm. Respect forged in fire.' },
    deadlift: { idle: ['Iron scales scrape the ground. The Wyrm coils.', 'Steam vents from its joints. It\'s watching.'], hit: ['A scale flies loose.', 'The Wyrm hisses. You bent iron.'], nearDefeat: 'Its furnace dims. One more pull.', defeated: 'The Iron Wyrm lowers its head. The forge acknowledges you.' },
    bench_press: { idle: ['The Fire Shield hovers. Flames lick its edges.', 'Heat radiates. It dares you to push.'], hit: ['The flames sputter.', 'A crack runs through the shield.'], nearDefeat: 'The fire is dying. Break through.', defeated: 'The shield splits. Embers scatter. You pressed through fire.' },
    pull_up: { idle: ['The Sky Drake circles above. Waiting for you to rise.', '"Gravity is mine," it hisses from above.'], hit: ['It drops lower.', 'The Drake\'s wings clip. You\'re rising.'], nearDefeat: 'Eye level. One more and you\'re above it.', defeated: 'The Sky Drake lands beside you. "You fly now."' },
    overhead_press: { idle: ['Lightning gathers above. The Dragon waits.', 'Thunder rolls. It\'s charging.'], hit: ['The bolt scatters.', 'The Dragon roars. Your strike found sky.'], nearDefeat: 'The storm breaks around you. Push through.', defeated: 'The Thunder Dragon dissipates. Clear skies earned.' },
    run_1_mile: { idle: ['The Wind Serpent slithers through the air ahead.', 'Feathers shimmer. It\'s already moving.'], hit: ['You\'re closing the gap.', 'The Serpent\'s coils tighten — it\'s surprised.'], nearDefeat: 'Its tail is within reach. Don\'t stop.', defeated: 'The Wind Serpent coils around you. Ally, not prey.' },
    plank: { idle: ['The Lava Tortoise settles in. Eternal patience.', '"My shell has endured eons. What\'s your excuse?"'], hit: ['A crack in the shell.', 'The tortoise shifts. Barely.'], nearDefeat: '"Still holding? ...Unexpected."', defeated: 'The Tortoise exhales smoke. "You have the fire."' },
    push_ups: { idle: ['Flames dance. The Sprites giggle.', 'They multiply. One becomes three becomes five.'], hit: ['A sprite pops out of existence.', 'The swarm shrinks.'], nearDefeat: 'The last few flicker desperately.', defeated: 'The flames die to embers. They\'ll return brighter.' },
    run_400m: { idle: ['Lightning crackles. The Drake is a blur.', 'Static fills the air. It\'s already ahead.'], hit: ['You match its pace.', 'The Drake\'s sparks dim — you\'re keeping up.'], nearDefeat: 'Almost caught it. Full burn.', defeated: 'The Lightning Drake stops. Electricity fades. "Fast."' },
    dead_hang: { idle: ['Gravity intensifies. The Phantom pulls down.', '"Everything falls," it whispers. "Even you."'], hit: ['The pull lessens slightly.', '"Still hanging?" Genuine confusion.'], nearDefeat: '"You defy me. How?"', defeated: 'The Gravity Phantom releases. Weightless. You won.' },
    barbell_row: { idle: ['The Deep Wyrm surfaces. One eye. Watching.', 'Bioluminescence pulses in the dark.'], hit: ['It recoils into the depths.', 'A tentacle releases its grip.'], nearDefeat: 'The eye blinks. It\'s retreating.', defeated: 'The Deep Wyrm submerges. The abyss acknowledges strength.' },
    run_5k: { idle: ['Storm clouds gather. The Dragon is the storm.', 'Rain begins. Lightning in the distance. It waits.'], hit: ['The storm weakens.', 'You push through the headwind.'], nearDefeat: 'The eye of the storm. Almost through.', defeated: 'The Storm Dragon dissolves into blue sky. You outran weather itself.' },
  },
};

export function getBattleNarration(card: BattleCard, theme: string): string {
  const normalized = card.exerciseId.replace(/^(barbell|dumbbell|smith_machine|cable|machine)_/, '');
  const creature = CREATURE_DIALOGUE[theme]?.[normalized] || CREATURE_DIALOGUE['samurai']?.[normalized];
  const enemyName = ENEMY_NAMES[theme]?.[normalized] || 'The enemy';
  const isAllied = (card.currentLevel || 0) >= 1;

  // Allied creatures are sparring partners, not enemies
  if (isAllied) {
    if (card.defeated) return `${enemyName} nods. "Good session."`;
    if (card.completedSets === 0) return `${enemyName} stretches beside you. "Ready when you are."`;
    if (card.completedSets + 1 >= card.totalSets) return `${enemyName} grins. "One more. Show me."`;
    return `${enemyName} matches your effort. "Again."`;
  }

  if (!creature) {
    if (card.defeated) return `${enemyName} yields.`;
    if (card.completedSets === 0) return `${enemyName} watches. Waiting.`;
    if (card.completedSets + 1 >= card.totalSets) return `${enemyName} staggers. One more.`;
    return `${enemyName} felt that. Keep going.`;
  }

  if (card.defeated) return creature.defeated;
  if (card.completedSets === 0) return creature.idle[Math.abs(card.id.charCodeAt(0)) % creature.idle.length];
  if (card.completedSets + 1 >= card.totalSets) return creature.nearDefeat;
  return creature.hit[card.completedSets % creature.hit.length];
}

export interface EnemySpriteProps {
  exerciseId: string;
  level: number;
  defeated: boolean;
  theme: string;
  showName?: boolean;
  attackCount?: number;
}

export default function EnemySprite({ exerciseId, level, defeated, theme, showName, attackCount }: EnemySpriteProps) {
  const tier = level >= 4 ? 2 : level >= 2 ? 1 : 0;
  const normalized = exerciseId.replace(/^(barbell|dumbbell|smith_machine|cable|machine)_/, '');
  const src = `/enemies/${theme}/${normalized}_t${tier}.png`;
  const [hasImage, setHasImage] = useState(true);
  const [flashing, setFlashing] = useState(false);
  const prevAttack = useRef(attackCount || 0);
  const enemyName = ENEMY_NAMES[theme]?.[normalized] || null;

  useEffect(() => {
    if (attackCount !== undefined && attackCount > prevAttack.current) {
      setFlashing(true);
      setTimeout(() => setFlashing(false), 300);
    }
    prevAttack.current = attackCount || 0;
  }, [attackCount]);

  if (!hasImage) return null;

  return (
    <div className={`flex flex-col items-center gap-2 py-2 transition-all duration-700 ${defeated ? 'opacity-0 scale-75' : 'opacity-100'}`}>
      <div className="w-20 h-20 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 rounded-lg" style={{ boxShadow: 'inset 0 0 12px rgba(0,0,0,0.9)' }} />
        <img
          src={src}
          alt=""
          className={`w-16 h-16 relative z-10 ${!defeated && !flashing ? 'animate-[breathe_3s_ease-in-out_infinite]' : ''}`}
          style={{
            imageRendering: 'pixelated',
            filter: flashing ? 'brightness(8)' : undefined,
            transform: flashing ? 'translateX(-2px)' : undefined,
            transition: flashing ? 'none' : 'filter 0.2s, transform 0.2s',
          }}
          onError={() => setHasImage(false)}
        />
      </div>
      {showName && enemyName && (
        <p className="text-xs text-white tracking-wide" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {enemyName}
        </p>
      )}
    </div>
  );
}
