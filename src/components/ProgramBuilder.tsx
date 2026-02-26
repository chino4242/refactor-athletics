"use client";

import { useState, useEffect } from 'react';
import { Plus, Dumbbell, Calendar, Edit, Trash2, X } from 'lucide-react';
import type { WorkoutProgram, ProgramBlock, Exercise } from '@/types';
import { getPrograms, createProgram, deleteProgram, getProgramBlocks, addProgramBlock, deleteProgramBlock } from '@/services/programApi';
import { getTrainingCatalog } from '@/services/api';

interface ProgramBuilderProps {
    userId: string;
}

export default function ProgramBuilder({ userId }: ProgramBuilderProps) {
    const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
    const [catalog, setCatalog] = useState<Exercise[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditorModal, setShowEditorModal] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState<WorkoutProgram | null>(null);
    const [programBlocks, setProgramBlocks] = useState<ProgramBlock[]>([]);
    const [newProgramName, setNewProgramName] = useState('');
    const [newProgramDescription, setNewProgramDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const categories = ['all', 'strength', 'metcon', 'gymnastics', 'endurance'];
    
    const filteredCatalog = selectedCategory === 'all' 
        ? catalog 
        : catalog.filter(ex => ex.category?.toLowerCase() === selectedCategory);

    console.log('Filtered catalog:', filteredCatalog.length, 'exercises for category:', selectedCategory);

    useEffect(() => {
        loadPrograms();
        loadCatalog();
    }, [userId]);

    const loadPrograms = async () => {
        try {
            const data = await getPrograms(userId);
            setPrograms(data);
        } catch (e) {
            console.error('Failed to load programs:', e);
        }
    };

    const loadCatalog = async () => {
        try {
            const data = await getTrainingCatalog();
            console.log('Loaded catalog:', data.length, 'exercises');
            console.log('Sample exercise:', data[0]);
            setCatalog(data);
        } catch (e) {
            console.error('Failed to load catalog:', e);
        }
    };

    const handleCreateProgram = async () => {
        if (!newProgramName.trim()) return;
        setLoading(true);
        try {
            await createProgram(userId, newProgramName, newProgramDescription);
            await loadPrograms();
            setShowCreateModal(false);
            setNewProgramName('');
            setNewProgramDescription('');
        } catch (e) {
            console.error('Failed to create program:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProgram = async (programId: string) => {
        if (!confirm('Delete this program?')) return;
        try {
            await deleteProgram(programId);
            await loadPrograms();
        } catch (e) {
            console.error('Failed to delete program:', e);
        }
    };

    const handleEditProgram = async (program: WorkoutProgram) => {
        setSelectedProgram(program);
        try {
            const blocks = await getProgramBlocks(program.id);
            setProgramBlocks(blocks);
            setShowEditorModal(true);
        } catch (e) {
            console.error('Failed to load program blocks:', e);
        }
    };

    const handleAddExercise = async (exerciseId: string) => {
        if (!selectedProgram) return;
        try {
            const newBlock: Partial<ProgramBlock> = {
                program_id: selectedProgram.id,
                block_order: programBlocks.length,
                block_type: 'exercise',
                exercise_id: exerciseId,
                target_sets: 3,
                target_reps: 10,
            };
            await addProgramBlock(newBlock);
            const blocks = await getProgramBlocks(selectedProgram.id);
            setProgramBlocks(blocks);
        } catch (e) {
            console.error('Failed to add exercise:', e);
        }
    };

    const handleDeleteBlock = async (blockId: string) => {
        try {
            await deleteProgramBlock(blockId);
            if (selectedProgram) {
                const blocks = await getProgramBlocks(selectedProgram.id);
                setProgramBlocks(blocks);
            }
        } catch (e) {
            console.error('Failed to delete block:', e);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto px-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black italic text-white uppercase tracking-tighter">Workout Programs</h1>
                    <p className="text-sm text-zinc-400">Create custom workouts</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black font-bold px-4 py-2.5 rounded-lg transition whitespace-nowrap"
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
                        <p className="text-sm text-zinc-500 mb-4">Create your first workout program</p>
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
                            className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 hover:border-zinc-500 transition"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="text-lg font-bold text-white truncate">{program.name}</h3>
                                <button
                                    onClick={() => handleDeleteProgram(program.id)}
                                    className="text-zinc-600 hover:text-red-500 transition flex-shrink-0"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            {program.description && (
                                <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{program.description}</p>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEditProgram(program)}
                                    className="flex-1 text-xs font-bold bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded transition flex items-center justify-center gap-1"
                                >
                                    <Edit size={14} />
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
                                    placeholder="Brief description..."
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
                                onClick={handleCreateProgram}
                                disabled={!newProgramName.trim() || loading}
                                className="flex-1 bg-white hover:bg-zinc-200 text-black font-bold py-2.5 rounded-lg transition disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Editor Modal */}
            {showEditorModal && selectedProgram && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl p-6 my-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl font-black italic text-white uppercase truncate">{selectedProgram.name}</h2>
                                <p className="text-sm text-zinc-400">Add exercises to your program</p>
                            </div>
                            <button
                                onClick={() => setShowEditorModal(false)}
                                className="text-zinc-500 hover:text-white transition flex-shrink-0 ml-4"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Exercise List */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-zinc-400 uppercase mb-2">Available Exercises</h3>
                                
                                {/* Category Filter */}
                                <div className="flex gap-2 flex-wrap">
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg transition ${
                                                selectedCategory === cat
                                                    ? 'bg-orange-600 text-white'
                                                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-2">
                                    {filteredCatalog.map(exercise => (
                                        <button
                                            key={exercise.id}
                                            onClick={() => handleAddExercise(exercise.id)}
                                            className="w-full text-left bg-zinc-800/50 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-2.5 transition group"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-bold text-white">{exercise.display_name}</span>
                                                <Plus size={14} className="text-zinc-600 group-hover:text-orange-500 flex-shrink-0" />
                                            </div>
                                            {exercise.category && (
                                                <span className="text-xs text-zinc-500 uppercase">{exercise.category}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Program Blocks */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-zinc-400 uppercase mb-2">Program ({programBlocks.length} exercises)</h3>
                                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                    {programBlocks.length === 0 ? (
                                        <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-lg">
                                            <Dumbbell size={32} className="mx-auto mb-2 text-zinc-700" />
                                            <p className="text-sm text-zinc-500">Add exercises from the left</p>
                                        </div>
                                    ) : (
                                        programBlocks.map((block, idx) => {
                                            const exercise = catalog.find(e => e.id === block.exercise_id);
                                            return (
                                                <div
                                                    key={block.id}
                                                    className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-bold text-zinc-500 flex-shrink-0">#{idx + 1}</span>
                                                                <span className="text-sm font-bold text-white">
                                                                    {exercise?.display_name || block.exercise_id}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-zinc-400">
                                                                <span>{block.target_sets} sets</span>
                                                                <span>×</span>
                                                                <span>{block.target_reps} reps</span>
                                                                {exercise?.category && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="uppercase text-zinc-500">{exercise.category}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteBlock(block.id)}
                                                            className="text-zinc-600 hover:text-red-500 transition flex-shrink-0"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
