"use client";

import { useState } from 'react';
import { Plus, Dumbbell, Calendar } from 'lucide-react';
import type { WorkoutProgram } from '@/types';

interface ProgramBuilderProps {
    userId: string;
}

export default function ProgramBuilder({ userId }: ProgramBuilderProps) {
    const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProgramName, setNewProgramName] = useState('');
    const [newProgramDescription, setNewProgramDescription] = useState('');

    return (
        <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black italic text-white uppercase tracking-tighter">Workout Programs</h1>
                    <p className="text-sm text-zinc-400">Create custom workouts and schedule them</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black font-bold px-4 py-2.5 rounded-lg transition"
                >
                    <Plus size={18} />
                    New Program
                </button>
            </div>

            {/* Programs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.length === 0 ? (
                    <div className="col-span-full bg-zinc-800/50 border border-zinc-700 rounded-xl p-12 text-center">
                        <Dumbbell size={48} className="mx-auto mb-4 text-zinc-600" />
                        <h3 className="text-lg font-bold text-zinc-400 mb-2">No Programs Yet</h3>
                        <p className="text-sm text-zinc-500 mb-4">Create your first workout program to get started</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold px-6 py-2.5 rounded-lg transition"
                        >
                            Create Program
                        </button>
                    </div>
                ) : (
                    programs.map(program => (
                        <div
                            key={program.id}
                            className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 hover:border-zinc-500 transition cursor-pointer"
                        >
                            <h3 className="text-lg font-bold text-white mb-1">{program.name}</h3>
                            {program.description && (
                                <p className="text-sm text-zinc-400 mb-3">{program.description}</p>
                            )}
                            <div className="flex gap-2">
                                <button className="flex-1 text-xs font-bold bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded transition">
                                    Edit
                                </button>
                                <button className="flex-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded transition flex items-center justify-center gap-1">
                                    <Calendar size={14} />
                                    Schedule
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-black italic text-white mb-4 uppercase">Create Program</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Program Name</label>
                                <input
                                    type="text"
                                    value={newProgramName}
                                    onChange={(e) => setNewProgramName(e.target.value)}
                                    placeholder="e.g., Upper Body Push"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 outline-none"
                                />
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Description (Optional)</label>
                                <textarea
                                    value={newProgramDescription}
                                    onChange={(e) => setNewProgramDescription(e.target.value)}
                                    placeholder="Brief description of this workout..."
                                    rows={3}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 outline-none resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setNewProgramName('');
                                    setNewProgramDescription('');
                                }}
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold py-2.5 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    // TODO: Create program
                                    console.log('Creating program:', { name: newProgramName, description: newProgramDescription });
                                    setShowCreateModal(false);
                                }}
                                disabled={!newProgramName.trim()}
                                className="flex-1 bg-white hover:bg-zinc-200 text-black font-bold py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
