'use client';

import { useState } from 'react';
import { saveProfile } from '@/services/api';
import { useRouter } from 'next/navigation';
import { THEMES } from '@/data/themes';

interface OnboardingWizardProps {
    userId: string;
}

export default function OnboardingWizard({ userId }: OnboardingWizardProps) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        age: '',
        sex: '',
        bodyweight: '',
        target_weight: '',
        theme: 'athlete',
    });

    const handleNext = () => {
        if (step < 4) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
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
            selected_theme: formData.theme,
            is_onboarded: true,
        });
        router.refresh();
    };

    const themeOptions = Object.entries(THEMES).map(([key, theme]) => ({
        key,
        name: theme.displayName,
        emoji: theme.emoji,
    }));

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-zinc-900 rounded-lg max-w-md w-full p-6 my-8">
                <div className="mb-6">
                    <div className="flex gap-2 mb-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded ${i <= step ? 'bg-orange-500' : 'bg-zinc-700'}`} />
                        ))}
                    </div>
                    <h2 className="text-2xl font-bold text-white">Welcome to Refactor Athletics</h2>
                </div>

                {step === 1 && (
                    <div className="space-y-4">
                        <div className="text-zinc-300 space-y-3">
                            <p className="font-semibold text-orange-400">What is Refactor Athletics?</p>
                            <p className="text-sm">
                                Refactor Athletics is a fitness RPG that turns your real-world training into a game. 
                                Track workouts, earn XP, level up, and compete with others.
                            </p>
                            <p className="text-sm">
                                Your performance is ranked against age and sex-adjusted standards, so everyone competes fairly. 
                                Build your <span className="text-orange-400 font-semibold">Power Level</span> by mastering exercises across 
                                Strength, Endurance, Power, and Mobility.
                            </p>
                            <p className="text-sm">
                                Challenge friends to duels, complete daily quests, and watch your progress transform into legendary status.
                            </p>
                        </div>
                    </div>
                )}

                {step === 2 && (
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

                {step === 3 && (
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
                            </select>
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

                {step === 4 && (
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

                <div className="flex gap-3 mt-6">
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded hover:bg-zinc-700"
                        >
                            Back
                        </button>
                    )}
                    {step < 4 ? (
                        <button
                            onClick={handleNext}
                            disabled={step === 3 && (!formData.age || !formData.sex || !formData.bodyweight)}
                            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            onClick={handleComplete}
                            disabled={!formData.target_weight}
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
