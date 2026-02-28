"use client";

import { useState, useEffect } from 'react';
import { Plus, Dumbbell, Calendar, Edit, Trash2, X, ArrowUp, ArrowDown, Check, Link, Unlink, Search } from 'lucide-react';
import type { Workout, WorkoutBlock, CatalogItem } from '@/types';
import { getWorkouts, createWorkout, deleteWorkout, getWorkoutBlocks, addWorkoutBlock, deleteWorkoutBlock, updateWorkoutBlock, scheduleWorkout } from '@/services/workoutApi';
import { getTrainingCatalog } from '@/services/api';

interface WorkoutBuilderProps {
    userId: string;
}

export default function WorkoutBuilder({ userId }: WorkoutBuilderProps) {
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditorModal, setShowEditorModal] = useState(false);
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
    const [workoutBlocks, setWorkoutBlocks] = useState<WorkoutBlock[]>([]);
    const [newWorkoutName, setNewWorkoutName] = useState('');
    const [newWorkoutDescription, setNewWorkoutDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSupersetMode, setIsSupersetMode] = useState(false);
    const [selectedForSuperset, setSelectedForSuperset] = useState<Set<string>>(new Set());

    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [workoutToSchedule, setWorkoutToSchedule] = useState<Workout | null>(null);
    const [scheduleDate, setScheduleDate] = useState('');

    const categories = ['All', 'Strength', 'Power & Capacity', 'Endurance & Speed', 'Olympic', 'Cardio'];

    const filteredCatalog = catalog.filter(ex => {
        const matchesCategory = selectedCategory === 'All' || ex.category === selectedCategory;
        const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    console.log('Filtered catalog:', filteredCatalog.length, 'exercises for category:', selectedCategory);

    useEffect(() => {
        loadWorkouts();
        loadCatalog();
    }, [userId]);

    const loadWorkouts = async () => {
        try {
            const data = await getWorkouts(userId);
            setWorkouts(data);
        } catch (e) {
            console.error('Failed to load Workouts:', e);
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

    const handleCreateWorkout = async () => {
        if (!newWorkoutName.trim()) return;
        setLoading(true);
        try {
            await createWorkout(userId, newWorkoutName, newWorkoutDescription);
            await loadWorkouts();
            setShowCreateModal(false);
            setNewWorkoutName('');
            setNewWorkoutDescription('');
        } catch (e) {
            console.error('Failed to create Workout:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleWorkout = async () => {
        if (!workoutToSchedule || !scheduleDate) return;
        setLoading(true);
        try {
            await scheduleWorkout(userId, workoutToSchedule.id, scheduleDate);
            setScheduleModalOpen(false);
            setWorkoutToSchedule(null);
            setScheduleDate('');
            // Simple visual feedback for now:
            alert('Workout scheduled!');
        } catch (e) {
            console.error('Failed to schedule workout:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteWorkout = async (WorkoutId: string) => {
        if (!confirm('Delete this Workout?')) return;
        try {
            await deleteWorkout(WorkoutId);
            await loadWorkouts();
        } catch (e) {
            console.error('Failed to delete Workout:', e);
        }
    };

    const handleEditWorkout = async (workout: Workout) => {
        setSelectedWorkout(workout);
        try {
            const blocks = await getWorkoutBlocks(workout.id);
            setWorkoutBlocks(blocks);
            setShowEditorModal(true);
        } catch (e) {
            console.error('Failed to load Workout blocks:', e);
        }
    };

    const handleAddExercise = async (exerciseId: string) => {
        if (!selectedWorkout) return;
        const exercise = catalog.find(e => e.id === exerciseId);
        if (!exercise) return;

        const isEndurance = exercise.category === 'Endurance & Speed' || exercise.category === 'Cardio';
        const isOlympic = exercise.category === 'Olympic';
        const isPower = exercise.category === 'Power & Capacity';

        let isTreadmill = false;
        let defaultSets: number | undefined = 3;
        let defaultReps: number | undefined = 10;
        let defaultDurationSeconds: number | undefined = undefined;
        let defaultIntensity: 'zone2' | 'base' | 'push' | 'all_out' | undefined = undefined;

        if (exerciseId.startsWith('treadmill_')) {
            isTreadmill = true;
            defaultSets = undefined;
            defaultReps = undefined;
            defaultDurationSeconds = 60; // default 1 min
            if (exerciseId.includes('all_out')) defaultIntensity = 'all_out';
            else if (exerciseId.includes('push')) defaultIntensity = 'push';
            else if (exerciseId.includes('base')) defaultIntensity = 'base';
            else defaultIntensity = 'zone2';
        } else if (isEndurance) {
            defaultSets = 1;
            defaultReps = undefined;
        } else if (isOlympic || isPower) {
            defaultSets = 5;
            defaultReps = 3;
        }

        try {
            const newBlock: Partial<WorkoutBlock> = {
                workout_id: selectedWorkout.id,
                block_order: workoutBlocks.length,
                block_type: isTreadmill ? 'treadmill' : 'exercise',
                exercise_id: exerciseId,
                target_sets: defaultSets,
                target_reps: defaultReps,
                duration_seconds: defaultDurationSeconds,
                intensity: defaultIntensity,
            };
            await addWorkoutBlock(newBlock);
            const blocks = await getWorkoutBlocks(selectedWorkout.id);
            setWorkoutBlocks(blocks);
        } catch (e) {
            console.error('Failed to add exercise:', e);
        }
    };

    const handleUpdateBlock = async (blockId: string, field: keyof WorkoutBlock, value: string) => {
        // Optimistically update UI
        let parsedValue: string | number | null = value;
        if (field !== 'intensity' && field !== 'notes') {
            parsedValue = value === '' ? null : parseInt(value, 10);
        }

        setWorkoutBlocks(prev => prev.map(block =>
            block.id === blockId
                ? { ...block, [field]: parsedValue }
                : block
        ));

        // Sync with backend
        try {
            await updateWorkoutBlock(blockId, { [field]: parsedValue as any });
        } catch (e) {
            console.error('Failed to update block:', e);
            // Revert on failure by reloading
            if (selectedWorkout) {
                const blocks = await getWorkoutBlocks(selectedWorkout.id);
                setWorkoutBlocks(blocks);
            }
        }
    };

    const handleDeleteBlock = async (blockId: string) => {
        try {
            await deleteWorkoutBlock(blockId);
            if (selectedWorkout) {
                const blocks = await getWorkoutBlocks(selectedWorkout.id);
                setWorkoutBlocks(blocks);
            }
        } catch (e) {
            console.error('Failed to delete block:', e);
        }
    };

    const handleReorderBlock = async (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === workoutBlocks.length - 1)
        ) return;

        const newBlocks = [...workoutBlocks];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap locally
        const temp = newBlocks[index];
        newBlocks[index] = newBlocks[swapIndex];
        newBlocks[swapIndex] = temp;

        // Update order properties
        newBlocks.forEach((b, i) => { b.block_order = i; });
        setWorkoutBlocks(newBlocks);

        // Sync with backend one by one (could be optimized later)
        try {
            await updateWorkoutBlock(newBlocks[index].id, { block_order: newBlocks[index].block_order });
            await updateWorkoutBlock(newBlocks[swapIndex].id, { block_order: newBlocks[swapIndex].block_order });
        } catch (e) {
            console.error('Failed to reorder blocks:', e);
            if (selectedWorkout) {
                const blocks = await getWorkoutBlocks(selectedWorkout.id);
                setWorkoutBlocks(blocks);
            }
        }
    };

    const handleToggleSupersetSelection = (blockId: string) => {
        const newSelection = new Set(selectedForSuperset);
        if (newSelection.has(blockId)) {
            newSelection.delete(blockId);
        } else {
            newSelection.add(blockId);
        }
        setSelectedForSuperset(newSelection);
    };

    const handleCreateSuperset = async () => {
        if (selectedForSuperset.size < 2) return;

        // Find the highest existing superset_group ID
        const existingGroups = workoutBlocks
            .map(b => b.superset_group)
            .filter((g): g is number => g !== null && g !== undefined);
        const nextGroupId = existingGroups.length > 0 ? Math.max(...existingGroups) + 1 : 1;

        const updatedBlocks = workoutBlocks.map(block => {
            if (selectedForSuperset.has(block.id)) {
                return { ...block, is_superset: true, superset_group: nextGroupId };
            }
            return block;
        });

        // Optimistic update
        setWorkoutBlocks(updatedBlocks);
        setIsSupersetMode(false);
        setSelectedForSuperset(new Set());

        // Sync to backend
        try {
            await Promise.all(
                Array.from(selectedForSuperset).map(blockId =>
                    updateWorkoutBlock(blockId, { is_superset: true, superset_group: nextGroupId })
                )
            );
        } catch (e) {
            console.error('Failed to create superset:', e);
            if (selectedWorkout) {
                const blocks = await getWorkoutBlocks(selectedWorkout.id);
                setWorkoutBlocks(blocks);
            }
        }
    };

    const handleUngroupSuperset = async (blockId: string) => {
        // Optimistic update
        setWorkoutBlocks(prev => prev.map(block =>
            block.id === blockId ? { ...block, is_superset: false, superset_group: null as unknown as number } : block
        ));

        // Sync to backend
        try {
            await updateWorkoutBlock(blockId, { is_superset: false, superset_group: null as any });
        } catch (e) {
            console.error('Failed to ungroup superset:', e);
            if (selectedWorkout) {
                const blocks = await getWorkoutBlocks(selectedWorkout.id);
                setWorkoutBlocks(blocks);
            }
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto px-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black italic text-white uppercase tracking-tighter">Workouts</h1>
                    <p className="text-sm text-zinc-400">Create custom workouts</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black font-bold px-4 py-2.5 rounded-lg transition whitespace-nowrap"
                >
                    <Plus size={18} />
                    New Workout
                </button>
            </div>

            {/* Workouts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workouts.length === 0 ? (
                    <div className="col-span-full bg-zinc-800/50 border border-zinc-700 rounded-xl p-12 text-center">
                        <Dumbbell size={48} className="mx-auto mb-4 text-zinc-600" />
                        <h3 className="text-lg font-bold text-zinc-400 mb-2">No Workouts Yet</h3>
                        <p className="text-sm text-zinc-500 mb-4">Create your first workout</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold px-6 py-2.5 rounded-lg transition"
                        >
                            Create Workout
                        </button>
                    </div>
                ) : (
                    workouts.map(workout => (
                        <div
                            key={workout.id}
                            className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 hover:border-zinc-500 transition"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="text-lg font-bold text-white truncate">{workout.name}</h3>
                                <button
                                    onClick={() => handleDeleteWorkout(workout.id)}
                                    className="text-zinc-600 hover:text-red-500 transition flex-shrink-0"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            {workout.description && (
                                <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{workout.description}</p>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEditWorkout(workout)}
                                    className="flex-1 text-xs font-bold bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded transition flex items-center justify-center gap-1"
                                >
                                    <Edit size={14} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => { setWorkoutToSchedule(workout); setScheduleModalOpen(true); }}
                                    className="flex-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded transition flex items-center justify-center gap-1"
                                >
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
                        <h2 className="text-xl font-black italic text-white mb-4 uppercase">Create Workout</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Workout Name</label>
                                <input
                                    type="text"
                                    value={newWorkoutName}
                                    onChange={(e) => setNewWorkoutName(e.target.value)}
                                    placeholder="e.g., Upper Body Push"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Description (Optional)</label>
                                <textarea
                                    value={newWorkoutDescription}
                                    onChange={(e) => setNewWorkoutDescription(e.target.value)}
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
                                    setNewWorkoutName('');
                                    setNewWorkoutDescription('');
                                }}
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold py-2.5 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateWorkout}
                                disabled={!newWorkoutName.trim() || loading}
                                className="flex-1 bg-white hover:bg-zinc-200 text-black font-bold py-2.5 rounded-lg transition disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Editor Modal */}
            {showEditorModal && selectedWorkout && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl p-6 my-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl font-black italic text-white uppercase truncate">{selectedWorkout.name}</h2>
                                <p className="text-sm text-zinc-400">Add exercises to your Workout</p>
                            </div>
                            <button
                                onClick={() => setShowEditorModal(false)}
                                className="text-zinc-500 hover:text-white transition flex-shrink-0 ml-4"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-6">
                            {/* Exercise List */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-zinc-400 uppercase mb-2">Available Exercises</h3>

                                {/* Search Bar */}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search size={16} className="text-zinc-500" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search exercises..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition-colors"
                                    />
                                </div>

                                {/* Category Filter */}
                                <div className="flex gap-2 flex-wrap">
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg transition ${selectedCategory === cat
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
                                                <span className="text-sm font-bold text-white">{exercise.name}</span>
                                                <Plus size={14} className="text-zinc-600 group-hover:text-orange-500 flex-shrink-0" />
                                            </div>
                                            {exercise.category && (
                                                <span className="text-xs text-zinc-500 uppercase">{exercise.category}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Workout Blocks */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold text-zinc-400 uppercase">Workout ({workoutBlocks.length} exercises)</h3>
                                    {workoutBlocks.length > 1 && (
                                        <button
                                            onClick={() => {
                                                setIsSupersetMode(!isSupersetMode);
                                                if (isSupersetMode) setSelectedForSuperset(new Set());
                                            }}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isSupersetMode ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                                        >
                                            <Link size={14} />
                                            {isSupersetMode ? 'Cancel Grouping' : 'Group Superset'}
                                        </button>
                                    )}
                                </div>
                                {isSupersetMode && (
                                    <div className="mb-2 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg flex items-center justify-between">
                                        <span className="text-xs text-zinc-400">Select exercises to group</span>
                                        <button
                                            onClick={handleCreateSuperset}
                                            disabled={selectedForSuperset.size < 2}
                                            className="text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded transition disabled:opacity-50"
                                        >
                                            Group Selected
                                        </button>
                                    </div>
                                )}
                                <div className="space-y-0 max-h-96 overflow-y-auto pr-2 pb-2">
                                    {workoutBlocks.length === 0 ? (
                                        <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-lg mt-2">
                                            <Dumbbell size={32} className="mx-auto mb-2 text-zinc-700" />
                                            <p className="text-sm text-zinc-500">Add exercises from the left</p>
                                        </div>
                                    ) : (
                                        workoutBlocks.map((block, idx) => {
                                            const exercise = catalog.find(e => e.id === block.exercise_id);
                                            const isSelected = selectedForSuperset.has(block.id);
                                            const isSuperset = !!block.superset_group;
                                            const isLinkedTop = isSuperset && idx > 0 && workoutBlocks[idx - 1].superset_group === block.superset_group;
                                            const isLinkedBottom = isSuperset && idx < workoutBlocks.length - 1 && workoutBlocks[idx + 1].superset_group === block.superset_group;

                                            let containerClasses = `bg-zinc-800/50 border p-3 flex items-start gap-3 transition-colors ${isSupersetMode ? 'cursor-pointer hover:bg-zinc-700/50' : ''}`;

                                            if (isSuperset) {
                                                containerClasses += ` border-r-zinc-700 border-l-orange-500 border-l-[3px]`;
                                                if (isLinkedTop && isLinkedBottom) {
                                                    containerClasses += " border-y-zinc-800/50 rounded-none -mt-px";
                                                } else if (isLinkedTop) {
                                                    containerClasses += " border-b-zinc-700 border-t-zinc-800/50 rounded-b-lg -mt-px";
                                                } else if (isLinkedBottom) {
                                                    containerClasses += " border-t-zinc-700 border-b-zinc-800/50 rounded-t-lg mt-2";
                                                } else {
                                                    containerClasses += " border-zinc-700 rounded-lg mt-2";
                                                }
                                            } else {
                                                containerClasses += " border-zinc-700 rounded-lg mt-2";
                                            }

                                            if (isSelected) containerClasses += " ring-1 ring-orange-500 border-orange-500";

                                            return (
                                                <div
                                                    key={block.id}
                                                    className={containerClasses}
                                                    onClick={() => isSupersetMode && handleToggleSupersetSelection(block.id)}
                                                >
                                                    {isSupersetMode && (
                                                        <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-orange-600 border-orange-600' : 'border-zinc-500'}`}>
                                                            {isSelected && <Check size={14} className="text-white" />}
                                                        </div>
                                                    )}
                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-bold text-zinc-500 flex-shrink-0">#{idx + 1}</span>
                                                                <span className="text-sm font-bold text-white">
                                                                    {exercise?.name || block.exercise_id}
                                                                </span>
                                                                {isSuperset && !isLinkedTop && (
                                                                    <span className="text-[10px] font-bold tracking-wider text-orange-500 uppercase bg-orange-500/10 px-1.5 py-0.5 rounded">
                                                                        Superset {block.superset_group}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                                                                {block.block_type === 'treadmill' ? (
                                                                    <>
                                                                        {/* Duration in Minutes Input (backend deals with seconds) */}
                                                                        <div className="flex items-center gap-1.5 focus-within:text-white transition-colors">
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                step="0.5"
                                                                                value={block.duration_seconds ? block.duration_seconds / 60 : ''}
                                                                                onChange={(e) => {
                                                                                    const val = parseFloat(e.target.value);
                                                                                    handleUpdateBlock(block.id, 'duration_seconds', isNaN(val) ? '' : (val * 60).toString());
                                                                                }}
                                                                                className="w-14 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-center text-white focus:border-orange-500 focus:outline-none transition-colors"
                                                                                placeholder="0.0"
                                                                            />
                                                                            <span>min</span>
                                                                        </div>

                                                                        <span className="text-zinc-600">@</span>

                                                                        {/* Incline Input */}
                                                                        <div className="flex items-center gap-1.5 focus-within:text-white transition-colors">
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                step="0.5"
                                                                                value={block.incline !== null && block.incline !== undefined ? block.incline : ''}
                                                                                onChange={(e) => handleUpdateBlock(block.id, 'incline', e.target.value)}
                                                                                className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-center text-white focus:border-orange-500 focus:outline-none transition-colors"
                                                                                placeholder="-"
                                                                            />
                                                                            <span>% Inc</span>
                                                                        </div>

                                                                        {/* Dropdown removed based on explicit catalog item intensity */}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="flex items-center gap-1.5 focus-within:text-white transition-colors">
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                value={block.target_weight || ''}
                                                                                onChange={(e) => handleUpdateBlock(block.id, 'target_weight', e.target.value)}
                                                                                className="w-16 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-center text-white focus:border-orange-500 focus:outline-none transition-colors"
                                                                                placeholder="lbs"
                                                                            />
                                                                            <span>lbs</span>
                                                                        </div>

                                                                        <span className="text-zinc-600">@</span>

                                                                        <div className="flex items-center gap-1.5 focus-within:text-white transition-colors">
                                                                            <input
                                                                                type="number"
                                                                                min="1"
                                                                                value={block.target_sets || ''}
                                                                                onChange={(e) => handleUpdateBlock(block.id, 'target_sets', e.target.value)}
                                                                                className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-center text-white focus:border-orange-500 focus:outline-none transition-colors"
                                                                            />
                                                                            <span>sets</span>
                                                                        </div>

                                                                        <span className="text-zinc-600">×</span>

                                                                        <div className="flex items-center gap-1.5 focus-within:text-white transition-colors">
                                                                            <input
                                                                                type="number"
                                                                                min="1"
                                                                                value={block.target_reps || ''}
                                                                                onChange={(e) => handleUpdateBlock(block.id, 'target_reps', e.target.value)}
                                                                                className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-center text-white focus:border-orange-500 focus:outline-none transition-colors"
                                                                                placeholder="-"
                                                                            />
                                                                            <span>reps</span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-1 border-l border-zinc-700 pl-2 ml-2">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleReorderBlock(idx, 'up'); }}
                                                                disabled={idx === 0 || isSupersetMode}
                                                                className="text-zinc-600 hover:text-white disabled:opacity-30 transition"
                                                            >
                                                                <ArrowUp size={16} />
                                                            </button>
                                                            {isSuperset && !isSupersetMode && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleUngroupSuperset(block.id); }}
                                                                    className="text-zinc-600 hover:text-orange-500 transition my-0.5"
                                                                    title="Remove from Superset"
                                                                >
                                                                    <Unlink size={16} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }}
                                                                disabled={isSupersetMode}
                                                                className="text-zinc-600 hover:text-red-500 transition my-0.5 disabled:opacity-30"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleReorderBlock(idx, 'down'); }}
                                                                disabled={idx === workoutBlocks.length - 1 || isSupersetMode}
                                                                className="text-zinc-600 hover:text-white disabled:opacity-30 transition"
                                                            >
                                                                <ArrowDown size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                {/* Save Workout Button (Bottom anchored) */}
                                <div className="mt-4 pt-4 border-t border-zinc-800">
                                    <button
                                        onClick={() => setShowEditorModal(false)}
                                        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black italic uppercase tracking-wider py-3 rounded-lg transition"
                                    >
                                        Save Workout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Modal */}
            {scheduleModalOpen && workoutToSchedule && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-6">
                        <h2 className="text-xl font-black italic text-white mb-2 uppercase">Schedule Workout</h2>
                        <p className="text-sm text-zinc-400 mb-6 truncate">Assigning: <span className="font-bold text-white">{workoutToSchedule.name}</span></p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Select Date</label>
                                <input
                                    type="date"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => {
                                    setScheduleModalOpen(false);
                                    setWorkoutToSchedule(null);
                                    setScheduleDate('');
                                }}
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold py-2.5 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleScheduleWorkout}
                                disabled={!scheduleDate || loading}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition disabled:opacity-50"
                            >
                                {loading ? 'Scheduling...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
