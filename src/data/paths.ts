export const PATHS = {
    hybrid: {
        name: 'Hybrid',
        emoji: '⚔️',
        description: 'Balanced training across Strength, Power, and Endurance.',
        philosophy: 'The Hybrid path follows a push/pull/legs split with integrated cardio conditioning. Monday targets chest, shoulders, and triceps. Tuesday hits back and biceps. Thursday is heavy compound day — squats, deadlifts, and overhead press. Friday isolates arms. Every training day includes a core circuit and a cardio block (HIIT or Zone 2, alternating). This program builds a well-rounded athlete who can lift heavy, run hard, and recover smart.',
    },
    strength: {
        name: 'Strength',
        emoji: '🛡️',
        description: 'Heavy lifting focused. Tank/Fighter archetype.',
        philosophy: 'The Strength path prioritizes progressive overload on the big compound lifts. Expect heavier weights, lower rep ranges, and longer rest periods. Cardio is minimal — just enough to maintain conditioning without interfering with recovery. Built for those who want to move serious weight.',
    },
    endurance: {
        name: 'Endurance',
        emoji: '🏹',
        description: 'Cardio and conditioning. Ranger archetype.',
        philosophy: 'The Endurance path emphasizes cardiovascular fitness, running economy, and muscular endurance. Training sessions feature longer cardio blocks, higher rep ranges on lifts, and circuit-style conditioning. Strength work is maintained but secondary to building an engine that never quits.',
    },
    mobility: {
        name: 'Mobility',
        emoji: '🧘',
        description: 'Flexibility, movement, and kettlebell flow. Monk archetype.',
        philosophy: 'The Mobility path builds functional strength through full range-of-motion movements, kettlebell flows, and dedicated flexibility work. Turkish get-ups, windmills, deep squats, and loaded stretches develop the kind of resilient, injury-proof body that moves well under any conditions.',
    },
} as const;

export type PathKey = keyof typeof PATHS;
