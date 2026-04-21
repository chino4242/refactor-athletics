"use client";

import { useState, useMemo } from 'react';
import { X, Search, Zap } from 'lucide-react';
import type { CatalogItem } from '@/types';
import { logTrainingAction } from '@/app/actions';
import { useToast } from '@/context/ToastContext';

interface Props {
  userId: string;
  bodyweight: number;
  sex: string;
  catalog: CatalogItem[];
  onClose: () => void;
  onLogged: () => void;
}

const CATEGORIES = ['All', 'Cardio', 'Cardio & Conditioning', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'Abs & Core', 'Plyometrics', 'Olympic', 'Power & Capacity', 'Endurance & Speed', 'Mobility'];

const QUICK_PICKS = [
  { id: 'running_generic', emoji: '🏃', label: 'Run' },
  { id: 'cycling', emoji: '🚴', label: 'Cycle' },
  { id: 'swimming', emoji: '🏊', label: 'Swim' },
  { id: 'rowing_general', emoji: '🚣', label: 'Row' },
  { id: 'elliptical', emoji: '🏃‍♀️', label: 'Elliptical' },
  { id: 'push_up', emoji: '💪', label: 'Push-Ups' },
  { id: 'pull_up', emoji: '🏋️', label: 'Pull-Ups' },
  { id: 'run_1_mile', emoji: '⏱️', label: '1mi Run' },
];

export default function QuickLogModal({ userId, bodyweight, sex, catalog, onClose, onLogged }: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [sets, setSets] = useState([{ weight: '', reps: '', duration: '', distance: '' }]);
  const [logging, setLogging] = useState(false);

  const filtered = useMemo(() => {
    return catalog
      .filter(c => !['Lifestyle', 'Nutrition', 'Recovery'].includes(c.category || ''))
      .filter(c => category === 'All' || c.category === category)
      .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, search, category]);

  const exerciseType = selected?.type?.toLowerCase() || '';
  const isCardio = exerciseType.includes('time') || exerciseType.includes('duration') || exerciseType.includes('distance') || exerciseType === 'cardio' || ['Cardio', 'Cardio & Conditioning', 'Endurance & Speed'].includes(selected?.category || '');
  const isBodyweight = exerciseType === 'reps_only';

  const toast = useToast();

  const handleLog = async () => {
    if (!selected) return;
    setLogging(true);
    try {
      const payload = sets.map(s => ({
        weight: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps) || 0,
        duration: parseFloat(s.duration) ? parseFloat(s.duration) * 60 : 0, // min → sec
        distance: parseFloat(s.distance) || 0,
      }));
      const result = await logTrainingAction(userId, selected.id, bodyweight, sex, payload);
      toast.xp(`${selected.name} logged! +${result.xp_earned} XP${result.rank_name ? ` • ${result.rank_name}` : ''}`);
      onLogged();
      onClose();
    } catch (e) {
      console.error('Quick log failed:', e);
    } finally {
      setLogging(false);
    }
  };

  const addSet = () => setSets(prev => [...prev, { weight: '', reps: '', duration: '', distance: '' }]);
  const updateSet = (i: number, field: string, val: string) => setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  // Exercise picker
  if (!selected) {
    return (
      <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
        <div className="bg-zinc-900 border-t border-zinc-700 rounded-t-2xl w-full max-w-lg h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Quick Log</h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-white text-xs font-bold px-3 py-1 rounded bg-zinc-800">✕</button>
          </div>

          <div className="px-4 pt-3">
            {/* Quick picks */}
            <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
              {QUICK_PICKS.map(qp => {
                const item = catalog.find(c => c.id === qp.id);
                if (!item) return null;
                return (
                  <button key={qp.id} onClick={() => setSelected(item)} className="flex flex-col items-center gap-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl hover:border-orange-500 transition min-w-[64px]">
                    <span className="text-lg">{qp.emoji}</span>
                    <span className="text-[9px] font-bold text-zinc-400 whitespace-nowrap">{qp.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search exercises..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-orange-500 outline-none"
                autoFocus
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
              {CATEGORIES.filter(c => c === 'All' || catalog.some(ex => ex.category === c)).map(c => (
                <button key={c} onClick={() => setCategory(c)} className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg whitespace-nowrap transition ${category === c ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition"
              >
                <span className="text-sm text-white">{c.name}</span>
                <span className="text-[10px] text-zinc-600 ml-2">{c.category}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-center text-zinc-500 text-xs py-8">No exercises found</p>}
          </div>
        </div>
      </div>
    );
  }

  // Input form
  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div className="bg-zinc-900 border-t border-zinc-700 rounded-t-2xl w-full max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-[10px] text-orange-500">← Change exercise</button>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white text-xs font-bold px-3 py-1 rounded bg-zinc-800">✕</button>
          </div>
        </div>

        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {sets.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600 w-6 text-center">{i + 1}</span>
              {isCardio ? (
                <>
                  <div className="flex flex-col flex-1">
                    <span className="text-[8px] text-zinc-600 text-center mb-0.5">MINUTES</span>
                    <input type="text" inputMode="decimal" placeholder="—" value={s.duration} onChange={e => updateSet(i, 'duration', e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-center text-sm text-white focus:border-orange-500 outline-none" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-[8px] text-zinc-600 text-center mb-0.5">MILES</span>
                    <input type="text" inputMode="decimal" placeholder="—" value={s.distance} onChange={e => updateSet(i, 'distance', e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-center text-sm text-white focus:border-orange-500 outline-none" />
                  </div>
                </>
              ) : isBodyweight ? (
                <div className="flex flex-col flex-1">
                  <span className="text-[8px] text-zinc-600 text-center mb-0.5">REPS</span>
                  <input type="text" inputMode="numeric" placeholder="—" value={s.reps} onChange={e => updateSet(i, 'reps', e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-center text-sm text-white focus:border-orange-500 outline-none" />
                </div>
              ) : (
                <>
                  <div className="flex flex-col flex-1">
                    <span className="text-[8px] text-zinc-600 text-center mb-0.5">LBS</span>
                    <input type="text" inputMode="decimal" placeholder="—" value={s.weight} onChange={e => updateSet(i, 'weight', e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-center text-sm text-white focus:border-orange-500 outline-none" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-[8px] text-zinc-600 text-center mb-0.5">REPS</span>
                    <input type="text" inputMode="numeric" placeholder="—" value={s.reps} onChange={e => updateSet(i, 'reps', e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-center text-sm text-white focus:border-orange-500 outline-none" />
                  </div>
                </>
              )}
            </div>
          ))}

          {!isCardio && (
            <button onClick={addSet} className="w-full text-[10px] text-zinc-500 hover:text-white py-2 border border-dashed border-zinc-700 rounded-lg transition">
              + Add Set
            </button>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={handleLog}
            disabled={logging}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold py-3 rounded-xl text-sm uppercase tracking-wider transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Zap size={16} />
            {logging ? 'Logging...' : 'Log Exercise'}
          </button>
        </div>
      </div>
    </div>
  );
}
