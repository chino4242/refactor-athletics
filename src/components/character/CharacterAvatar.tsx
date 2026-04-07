'use client';

export interface CharacterConfig {
    baseBody: 'male' | 'female';
    powerLevelTier: 1 | 2 | 3 | 4 | 5;
    skinTone: string;
    gear: {
        head?: string;
        torso?: string;
        legs?: string;
        accessory?: string;
        weapon?: string;
    };
    auraEnabled: boolean;
    particleEffects: boolean;
}

interface CharacterAvatarProps {
    config: CharacterConfig;
    size?: 'sm' | 'md' | 'lg';
    animated?: boolean;
}

const DIMENSIONS = { sm: 64, md: 128, lg: 256 };

export default function CharacterAvatar({ config, size = 'md', animated = false }: CharacterAvatarProps) {
    const dim = DIMENSIONS[size];
    const tier = config.powerLevelTier || 1;
    const body = config.baseBody || 'male';

    // Calculate hue rotation from hex skin tone
    const skinFilter = config.skinTone && config.skinTone !== '#d4a574'
        ? `hue-rotate(${hexToHueRotate(config.skinTone)}deg)`
        : undefined;

    return (
        <div className="relative" style={{ width: dim, height: dim }}>
            {/* Layer 1: Base body */}
            <img
                src={`/characters/bodies/${body}-tier${tier}.svg`}
                alt="Character"
                className="absolute inset-0 w-full h-full object-contain"
                style={skinFilter ? { filter: skinFilter } : undefined}
            />

            {/* Layer 2: Aura (Tier 3+) */}
            {tier >= 3 && config.auraEnabled && (
                <div className={`absolute inset-0 rounded-full ${animated ? 'animate-pulse' : ''}`}
                    style={{
                        background: `radial-gradient(circle, rgba(249,115,22,${tier >= 5 ? 0.3 : tier >= 4 ? 0.2 : 0.1}) 0%, transparent 70%)`,
                    }}
                />
            )}

            {/* Layer 3: Torso gear */}
            {config.gear.torso && (
                <img
                    src={`/characters/gear/torso/${config.gear.torso}.png`}
                    alt="Torso"
                    className="absolute inset-0 w-full h-full object-contain"
                />
            )}

            {/* Layer 4: Legs gear */}
            {config.gear.legs && (
                <img
                    src={`/characters/gear/legs/${config.gear.legs}.png`}
                    alt="Legs"
                    className="absolute inset-0 w-full h-full object-contain"
                />
            )}

            {/* Layer 5: Head gear */}
            {config.gear.head && (
                <img
                    src={`/characters/gear/head/${config.gear.head}.png`}
                    alt="Head"
                    className="absolute inset-0 w-full h-full object-contain"
                />
            )}

            {/* Layer 6: Accessory */}
            {config.gear.accessory && (
                <img
                    src={`/characters/gear/accessory/${config.gear.accessory}.png`}
                    alt="Accessory"
                    className="absolute inset-0 w-full h-full object-contain"
                />
            )}

            {/* Layer 7: Weapon */}
            {config.gear.weapon && (
                <img
                    src={`/characters/gear/weapon/${config.gear.weapon}.png`}
                    alt="Weapon"
                    className="absolute inset-0 w-full h-full object-contain"
                />
            )}

            {/* Layer 8: Particles (Tier 4+) */}
            {tier >= 4 && config.particleEffects && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/4 left-1/3 w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
                    <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-orange-400 rounded-full animate-pulse" />
                    <div className="absolute bottom-1/3 left-1/4 w-1 h-1 bg-orange-400 rounded-full animate-pulse delay-75" />
                </div>
            )}
        </div>
    );
}

function hexToHueRotate(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
        const d = max - min;
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    // Base skin tone (#d4a574) is roughly 28° hue
    return Math.round(h * 360) - 28;
}
