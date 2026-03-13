export const PATHS = {
    hybrid: {
        name: 'Hybrid',
        emoji: '⚔️',
        description: 'Balanced training across Strength, Power, and Endurance.',
    },
    strength: {
        name: 'Strength',
        emoji: '🛡️',
        description: 'Heavy lifting focused. Tank/Fighter archetype.',
    },
    endurance: {
        name: 'Endurance',
        emoji: '🏹',
        description: 'Cardio and conditioning. Ranger archetype.',
    },
    mobility: {
        name: 'Mobility',
        emoji: '🧘',
        description: 'Flexibility and movement. Monk archetype.',
    },
} as const;

export type PathKey = keyof typeof PATHS;
