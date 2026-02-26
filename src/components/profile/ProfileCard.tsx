"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { saveProfile } from '../../services/api';
import { Settings, Edit2, UserCog } from 'lucide-react';
import { signout } from '@/app/login/actions';

interface ProfileCardProps {
    displayName: string;
    userId: string;
    age: number;
    sex: string;
    currentWeight: number;
    goalWeight: number;
    level: number;
    onProfileUpdate: (newWeight: number, newAge: number, newSex: string) => void;
    onReload: () => void;
}

export default function ProfileCard({
    displayName,
    userId,
    age,
    sex,
    currentWeight,
    goalWeight,
    level,
    onProfileUpdate,
    onReload
}: ProfileCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const [formWeight, setFormWeight] = useState<number>(currentWeight);
    const [formGoalWeight, setFormGoalWeight] = useState<number>(goalWeight);
    const [formSex, setFormSex] = useState<string>(sex);
    const [formDob, setFormDob] = useState<string>('');
    const [calculatedAge, setCalculatedAge] = useState<number>(age);

    useEffect(() => {
        if (!isEditing) {
            setFormWeight(currentWeight);
            setFormSex(sex);
            setCalculatedAge(age);
            setFormGoalWeight(goalWeight);
        }
    }, [currentWeight, sex, age, goalWeight, isEditing]);

    const handleDobChange = (dateString: string) => {
        setFormDob(dateString);
        if (dateString) {
            const dob = new Date(dateString);
            const diff_ms = Date.now() - dob.getTime();
            const age_dt = new Date(diff_ms);
            const realAge = Math.abs(age_dt.getUTCFullYear() - 1970);
            setCalculatedAge(realAge);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            await saveProfile({
                user_id: userId,
                age: calculatedAge,
                sex: formSex,
                bodyweight: formWeight,
                goal_weight: formGoalWeight > 0 ? formGoalWeight : undefined,
                is_onboarded: true,
                display_name: displayName,
            });
            onProfileUpdate(formWeight, calculatedAge, formSex);
            setIsEditing(false);
            onReload();
        } catch (error) {
            console.error("Failed to save profile:", error);
            alert("Failed to save profile.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="md:col-span-2 bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50 shadow-xl backdrop-blur-sm relative overflow-hidden group">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                            {displayName}
                        </h2>
                        <span className="bg-orange-600 text-white text-[10px] md:text-xs font-black px-2 py-0.5 rounded border border-orange-500 shadow-lg shadow-orange-900/20">
                            LVL {level}
                        </span>
                    </div>
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Athlete Profile</span>
                </div>

                {!isEditing && (
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            aria-label="Settings Menu"
                            className="p-2 text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 rounded-lg transition-all border border-transparent hover:border-zinc-700"
                        >
                            <Settings size={18} />
                        </button>

                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                                <div className="absolute right-0 mt-2 w-40 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in-up">
                                    <button
                                        onClick={() => {
                                            setIsEditing(true);
                                            setShowMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-3 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2 border-b border-zinc-800"
                                    >
                                        <Edit2 size={14} />
                                        Edit Stats
                                    </button>
                                    <Link href="/settings" onClick={() => setShowMenu(false)}>
                                        <button className="w-full text-left px-4 py-3 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2">
                                            <UserCog size={14} />
                                            App Settings
                                        </button>
                                    </Link>
                                    <form action={signout}>
                                        <button className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:text-red-400 hover:bg-zinc-800 flex items-center gap-2 border-t border-zinc-800">
                                            Sign Out
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {isEditing ? (
                <div className="grid grid-cols-2 gap-4 relative z-10 bg-zinc-900/50 p-4 rounded-xl border border-zinc-700/50">
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Sex</label>
                        <select value={formSex} onChange={(e) => setFormSex(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white text-sm outline-none focus:border-orange-500 transition-colors">
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Birth Date</label>
                        <input type="date" value={formDob} onChange={(e) => handleDobChange(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white text-sm outline-none focus:border-orange-500 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Current Weight</label>
                        <input type="number" value={formWeight} onChange={(e) => setFormWeight(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white text-sm outline-none focus:border-orange-500 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Goal Weight</label>
                        <input type="number" value={formGoalWeight} onChange={(e) => setFormGoalWeight(Number(e.target.value))} placeholder="Optional" className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white text-sm outline-none focus:border-orange-500 transition-colors" />
                    </div>
                    <div className="col-span-2 flex justify-end gap-3 mt-2 border-t border-zinc-800 pt-4">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition uppercase tracking-wider">Cancel</button>
                        <button onClick={handleSaveProfile} disabled={isSaving} className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-2 rounded-lg text-xs transition shadow-lg uppercase tracking-wider">{isSaving ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-zinc-700/50 relative z-10 text-center">
                    <div className="pt-2 md:pt-0"><span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Age</span><span className="text-xl text-white font-mono font-bold">{calculatedAge}</span></div>
                    <div className="pt-2 md:pt-0"><span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Sex</span><span className="text-xl text-white font-mono font-bold capitalize">{sex}</span></div>
                    <div className="pt-2 md:pt-0"><span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Current</span><span className="text-xl text-white font-mono font-bold">{currentWeight} <span className="text-xs text-zinc-500">lbs</span></span></div>

                    {/* MERGED: Target Weight Display */}
                    <div className="pt-2 md:pt-0 flex flex-col items-center justify-center">
                        <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Target</span>
                        {goalWeight > 0 ? (
                            <>
                                <span className="text-xl text-white font-mono font-bold">{goalWeight} <span className="text-xs text-zinc-500">lbs</span></span>
                                {(() => {
                                    const diff = Math.abs(currentWeight - goalWeight).toFixed(1);
                                    const percentage = (Math.abs(currentWeight - goalWeight) / goalWeight) * 100;
                                    let color = 'text-red-500';
                                    if (percentage <= 2) color = 'text-emerald-400';
                                    else if (percentage <= 5) color = 'text-green-500';
                                    else if (percentage <= 10) color = 'text-yellow-500';
                                    else if (percentage <= 20) color = 'text-orange-500';

                                    return (
                                        <span className={`text-[10px] font-bold ${color} mt-0.5`}>{diff} lbs to go</span>
                                    )
                                })()}
                            </>
                        ) : (
                            <span className="text-sm text-zinc-600 italic mt-1">None set</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
