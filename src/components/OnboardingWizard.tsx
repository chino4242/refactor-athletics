'use client';

import { useState } from 'react';
import { saveProfile } from '@/services/api';
import { useRouter } from 'next/navigation';
import { THEMES } from '@/data/themes';
import { PATHS } from '@/data/paths';

interface OnboardingWizardProps {
    userId: string;
}

type ExperienceMode = 'rpg' | 'classic';

const EXPERIENCE_OPTIONS = [
    {
        key: 'rpg' as const,
        mode: 'rpg' as ExperienceMode,
        emoji: '⚔️',
        title: 'Compete & Level Up',
        description: 'Rank against standards, earn XP, unlock themes, challenge friends, and build your character.',
    },
    {
        key: 'classic' as const,
        mode: 'classic' as ExperienceMode,
        emoji: '🌱',
        title: 'Track & Improve',
        description: 'Clean charts, streaks, and personal bests. Focus on consistency and results.',
    },
];

export default function OnboardingWizard({ userId }: OnboardingWizardProps) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [waiverAccepted, setWaiverAccepted] = useState(false);
    const [experienceMode, setExperienceMode] = useState<ExperienceMode>('rpg');
    const [selectedMotivation, setSelectedMotivation] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        age: '',
        sex: '',
        bodyweight: '',
        target_weight: '',
        theme: 'athlete',
        path: 'hybrid',
        equipment: [] as string[],
    });

    // Classic mode skips theme selection (step 4)
    const steps = experienceMode === 'classic'
        ? [1, 2, 3, 5, 6, 7, 8] // waiver, motivation, intro, path, personal, goal, equipment
        : [1, 2, 3, 4, 5, 6, 7, 8]; // waiver, motivation, intro, theme, path, personal, goal, equipment

    const currentIndex = steps.indexOf(step);
    const totalSteps = steps.length;
    const isLastStep = currentIndex === totalSteps - 1;

    const handleNext = () => {
        if (!isLastStep) setStep(steps[currentIndex + 1]);
    };

    const handleBack = () => {
        if (currentIndex > 0) setStep(steps[currentIndex - 1]);
    };

    const handleComplete = async () => {
        await saveProfile({
            user_id: userId,
            age: parseInt(formData.age),
            sex: formData.sex,
            bodyweight: parseFloat(formData.bodyweight),
            body_composition_goals: {
                target_weight: formData.target_weight,
            },
            selected_theme: experienceMode === 'classic' ? 'athlete' : formData.theme,
            selected_path: formData.path,
            experience_mode: experienceMode,
            available_equipment: formData.equipment,
            is_onboarded: true,
            waiver_accepted_at: new Date().toISOString(),
        });
        localStorage.setItem('experience_mode', experienceMode);
        router.refresh();
    };

    const themeOptions = Object.entries(THEMES).map(([key, theme]) => ({
        key,
        name: theme.displayName,
        emoji: theme.emoji,
    }));

    const canAdvance = () => {
        switch (step) {
            case 1: return waiverAccepted;
            case 2: return selectedMotivation !== null;
            case 6: return formData.age && formData.sex && formData.bodyweight;
            case 7: return !!formData.target_weight;
            default: return true;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-zinc-900 rounded-lg max-w-md w-full p-6 my-8">
                <div className="mb-6">
                    <div className="flex gap-2 mb-4">
                        {steps.map((_, i) => (
                            <div key={i} className={`h-1 flex-1 rounded ${i <= currentIndex ? 'bg-orange-500' : 'bg-zinc-700'}`} />
                        ))}
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                        {step === 1 && 'Liability Waiver'}
                        {step === 2 && 'What brings you here?'}
                        {step === 3 && (experienceMode === 'rpg' ? 'Welcome to Refactor Athletics' : 'Welcome to Refactor Athletics')}
                        {step === 4 && 'Choose Your Theme'}
                        {step === 5 && (experienceMode === 'rpg' ? 'Choose Your Path' : 'Choose Your Focus')}
                        {step === 6 && 'About You'}
                        {step === 7 && 'Set Your Goal'}
                        {step === 8 && 'Your Equipment'}
                    </h2>
                </div>

                {/* Step 1: Waiver */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 max-h-64 overflow-y-auto text-sm text-zinc-300 space-y-3">
                            <p className="font-semibold text-white">ASSUMPTION OF RISK AND WAIVER OF LIABILITY</p>
                            <p>
                                By using Refactor Athletics, I acknowledge that physical exercise involves inherent risks including,
                                but not limited to, muscle strains, sprains, fractures, cardiovascular stress, and in rare cases,
                                serious injury or death.
                            </p>
                            <p>
                                I understand that Refactor Athletics is a fitness tracking application and does not provide medical
                                advice, supervision, or personalized training programs. I am solely responsible for determining my
                                fitness level and consulting with a healthcare provider before beginning any exercise program.
                            </p>
                            <p>
                                I voluntarily assume all risks associated with using this application and participating in physical
                                activities tracked through it. I agree to release, waive, discharge, and hold harmless Refactor
                                Athletics, its owners, developers, and affiliates from any and all liability for injuries or damages
                                resulting from my use of this application.
                            </p>
                            <p className="text-xs text-zinc-400 pt-2">
                                Last updated: March 13, 2026
                            </p>
                        </div>
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={waiverAccepted}
                                onChange={e => setWaiverAccepted(e.target.checked)}
                                className="mt-1 w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500"
                            />
                            <span className="text-sm text-zinc-300">
                                I have read and agree to the terms of this waiver. I understand the risks involved in physical exercise
                                and assume full responsibility for my participation.
                            </span>
                        </label>
                    </div>
                )}

                {/* Step 2: Experience Mode */}
                {step === 2 && (
                    <div className="space-y-3">
                        {EXPERIENCE_OPTIONS.map(option => (
                            <button
                                key={option.key}
                                onClick={() => {
                                    setSelectedMotivation(option.key);
                                    setExperienceMode(option.mode);
                                }}
                                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                                    selectedMotivation === option.key
                                        ? 'border-orange-500 bg-orange-500/10'
                                        : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">{option.emoji}</span>
                                    <div>
                                        <div className="text-sm font-medium text-white">{option.title}</div>
                                        <div className="text-xs text-zinc-400 mt-1">{option.description}</div>
                                    </div>
                                </div>
                            </button>
                        ))}
                        <p className="text-xs text-zinc-500 pt-1">You can change this anytime in settings.</p>
                    </div>
                )}

                {/* Step 3: Introduction */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div className="text-zinc-300 space-y-3">
                            {experienceMode === 'rpg' ? (
                                <>
                                    <p className="font-semibold text-orange-400">Your fitness RPG awaits.</p>
                                    <p className="text-sm">
                                        Refactor Athletics turns your real-world training into a game.
                                        Track workouts, earn XP, level up, and compete with others.
                                    </p>
                                    <p className="text-sm">
                                        Your performance is ranked against age and sex-adjusted standards, so everyone competes fairly.
                                        Build your <span className="text-orange-400 font-semibold">Expertise</span> by mastering exercises across
                                        Strength, Endurance, Power, and Mobility.
                                    </p>
                                    <p className="text-sm">
                                        Challenge friends to duels, complete daily quests, and watch your progress transform into legendary status.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="font-semibold text-orange-400">Your fitness journey starts here.</p>
                                    <p className="text-sm">
                                        Refactor Athletics helps you build lasting habits with clear, actionable tracking.
                                        Log workouts, nutrition, and daily habits — then watch your consistency compound over time.
                                    </p>
                                    <p className="text-sm">
                                        Your performance is measured against age and sex-adjusted benchmarks, so you always know
                                        where you stand and what to aim for next.
                                    </p>
                                    <p className="text-sm">
                                        Track streaks, hit personal bests, and see your progress through clean charts and weekly summaries.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 4: Theme Selection (RPG only) */}
                {step === 4 && (
                    <div className="space-y-4">
                        <p className="text-zinc-400">Choose your theme</p>
                        <div className="grid grid-cols-2 gap-3">
                            {themeOptions.map(theme => (
                                <button
                                    key={theme.key}
                                    onClick={() => setFormData({ ...formData, theme: theme.key })}
                                    className={`p-4 rounded-lg border-2 transition-all ${
                                        formData.theme === theme.key
                                            ? 'border-orange-500 bg-orange-500/10'
                                            : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                                    }`}
                                >
                                    <div className="text-3xl mb-2">{theme.emoji}</div>
                                    <div className="text-sm font-medium text-white">{theme.name}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 5: Path Selection */}
                {step === 5 && (
                    <div className="space-y-4">
                        {experienceMode === 'rpg' ? (
                            <>
                                <p className="text-zinc-400">Choose your training path</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(PATHS).map(([key, path]) => (
                                        <button
                                            key={key}
                                            onClick={() => setFormData({ ...formData, path: key })}
                                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                                                formData.path === key
                                                    ? 'border-orange-500 bg-orange-500/10'
                                                    : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                                            }`}
                                        >
                                            <div className="text-3xl mb-2">{path.emoji}</div>
                                            <div className="text-sm font-medium text-white">{path.name}</div>
                                            <div className="text-xs text-zinc-400 mt-1">{path.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-zinc-400">Here&apos;s how we&apos;ll help you improve</p>
                                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 space-y-4">
                                    <div className="text-sm font-semibold text-orange-400">General Wellness</div>
                                    <div className="space-y-3 text-sm text-zinc-300">
                                        <div className="flex items-start gap-3">
                                            <span className="text-base mt-0.5">🏃</span>
                                            <p>Aim for an hour of activity each day — walking, lifting, stretching, whatever moves you.</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="text-base mt-0.5">🥗</span>
                                            <p>Track nutrition to build awareness of what fuels your body best.</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="text-base mt-0.5">📈</span>
                                            <p>Build daily habits and watch your streaks grow — consistency beats intensity.</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="text-base mt-0.5">💤</span>
                                            <p>Sleep, hydration, and recovery are tracked alongside your workouts.</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-zinc-500">We&apos;ll personalize your dashboard based on your goals.</p>
                            </>
                        )}
                    </div>
                )}

                {/* Step 6: Personal Info */}
                {step === 6 && (
                    <div className="space-y-4">
                        <p className="text-zinc-400">Tell us about yourself</p>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Age</label>
                            <input
                                type="number"
                                value={formData.age}
                                onChange={e => setFormData({ ...formData, age: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
                                placeholder="25"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Sex</label>
                            <select
                                value={formData.sex}
                                onChange={e => setFormData({ ...formData, sex: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
                            >
                                <option value="">Select...</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="unspecified">Prefer not to say</option>
                            </select>
                            <p className="text-xs text-zinc-500 mt-1">Used for performance benchmarks. Defaults to combined averages if not specified.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Current Weight (lbs)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.bodyweight}
                                onChange={e => setFormData({ ...formData, bodyweight: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
                                placeholder="180"
                            />
                        </div>
                    </div>
                )}

                {/* Step 7: Goal Setting */}
                {step === 7 && (
                    <div className="space-y-4">
                        <p className="text-zinc-400">Set your goal</p>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Target Weight (lbs)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.target_weight}
                                onChange={e => setFormData({ ...formData, target_weight: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
                                placeholder="170"
                            />
                            <p className="text-xs text-zinc-500 mt-2">You can change this anytime in your profile</p>
                        </div>
                    </div>
                )}

                {/* Step 8: Equipment */}
                {step === 8 && (
                    <div className="space-y-4">
                        <p className="text-zinc-400">Select what you have access to. We&apos;ll tailor exercises to your setup.</p>
                        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                            {[
                                { id: 'barbell', label: 'Barbell', emoji: '🏋️' },
                                { id: 'dumbbells', label: 'Dumbbells', emoji: '💪' },
                                { id: 'kettlebells', label: 'Kettlebells', emoji: '🔔' },
                                { id: 'pull_up_bar', label: 'Pull-Up Bar', emoji: '🪜' },
                                { id: 'bench', label: 'Bench', emoji: '🪑' },
                                { id: 'squat_rack', label: 'Squat Rack', emoji: '🏗️' },
                                { id: 'smith_machine', label: 'Smith Machine', emoji: '🔩' },
                                { id: 'cables', label: 'Cable Machine', emoji: '🔗' },
                                { id: 'treadmill', label: 'Treadmill', emoji: '🏃' },
                                { id: 'rower', label: 'Rower', emoji: '🚣' },
                                { id: 'assault_bike', label: 'Assault / Echo Bike', emoji: '🚴' },
                                { id: 'ski_erg', label: 'Ski Erg', emoji: '⛷️' },
                                { id: 'resistance_bands', label: 'Resistance Bands', emoji: '🔄' },
                                { id: 'yoga_mat', label: 'Yoga Mat', emoji: '🧘' },
                                { id: 'rings', label: 'Gymnastic Rings', emoji: '🤸' },
                                { id: 'box', label: 'Plyo Box', emoji: '📦' },
                                { id: 'outdoor_running', label: 'Outdoor Running', emoji: '🌳' },
                                { id: 'bodyweight_only', label: 'Bodyweight Only', emoji: '🙋' },
                            ].map(item => {
                                const selected = formData.equipment.includes(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            const eq = selected
                                                ? formData.equipment.filter(e => e !== item.id)
                                                : [...formData.equipment, item.id];
                                            setFormData({ ...formData, equipment: eq });
                                        }}
                                        className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-2 ${
                                            selected
                                                ? 'border-orange-500 bg-orange-500/10'
                                                : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                                        }`}
                                    >
                                        <span className="text-lg">{item.emoji}</span>
                                        <span className="text-xs font-medium text-white">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-zinc-500">You can update this anytime in settings.</p>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-3 mt-6">
                    {currentIndex > 0 && (
                        <button
                            onClick={handleBack}
                            className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded hover:bg-zinc-700"
                        >
                            Back
                        </button>
                    )}
                    {!isLastStep ? (
                        <button
                            onClick={handleNext}
                            disabled={!canAdvance()}
                            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            onClick={handleComplete}
                            disabled={!canAdvance()}
                            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Complete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
