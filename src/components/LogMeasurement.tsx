'use client';

import { useState } from 'react';
import { X, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { logBodyMeasurementAction } from '@/app/actions';
import { useToast } from '@/context/ToastContext';

interface LogMeasurementProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  bodyweight: number;
  syncedData?: { weight?: number; body_fat_percentage?: number; lean_body_mass?: number };
  lastCircumferenceDate?: string;
  onSaved: () => void;
}

export default function LogMeasurement({ isOpen, onClose, userId, bodyweight, syncedData, lastCircumferenceDate, onSaved }: LogMeasurementProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  // Weight (always visible)
  const [weight, setWeight] = useState(syncedData?.weight ? String(syncedData.weight) : '');
  const weightSynced = !!syncedData?.weight;

  // Body Fat & Composition (collapsible)
  const [compOpen, setCompOpen] = useState(false);
  const [bodyFat, setBodyFat] = useState(syncedData?.body_fat_percentage ? String(syncedData.body_fat_percentage) : '');
  const [leanMass, setLeanMass] = useState(syncedData?.lean_body_mass ? String(syncedData.lean_body_mass) : '');
  const bodyFatSynced = !!syncedData?.body_fat_percentage;
  const leanMassSynced = !!syncedData?.lean_body_mass;

  // Circumferences (collapsible)
  const [circOpen, setCircOpen] = useState(false);
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [arms, setArms] = useState('');
  const [legs, setLeg] = useState('');
  const [shoulders, setShoulders] = useState('');

  const handleSave = async () => {
    const measurements: Record<string, number> = {};
    const w = parseFloat(weight);
    if (w > 0) measurements.weight = w;
    const bf = parseFloat(bodyFat);
    if (bf > 0) measurements.body_fat_percentage = bf;
    const lm = parseFloat(leanMass);
    if (lm > 0) measurements.lean_body_mass = lm;
    const wa = parseFloat(waist);
    if (wa > 0) measurements.waist = wa;
    const ch = parseFloat(chest);
    if (ch > 0) measurements.chest = ch;
    const ar = parseFloat(arms);
    if (ar > 0) measurements.arms = ar;
    const lg = parseFloat(legs);
    if (lg > 0) measurements.legs = lg;
    const sh = parseFloat(shoulders);
    if (sh > 0) measurements.shoulders = sh;

    if (Object.keys(measurements).length === 0) {
      toast.error('Enter at least one measurement');
      return;
    }

    setSaving(true);
    try {
      await logBodyMeasurementAction(userId, measurements, 'manual');
      toast.success('+5 Recon XP');
      onSaved();
      onClose();
    } catch (e) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-sm font-black italic text-white uppercase tracking-tight">Log Measurement</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1"><X size={18} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Weight — always visible */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Weight</label>
              {weightSynced && <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">🔗 Synced</span>}
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder={String(bodyweight || '')}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-center font-bold focus:border-orange-500 outline-none"
              />
              <span className="text-xs text-zinc-500 font-bold">lbs</span>
            </div>
          </div>

          {/* Body Fat & Composition — collapsible */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            <button onClick={() => setCompOpen(!compOpen)} className="w-full flex items-center justify-between p-3 hover:bg-zinc-800/50 transition">
              <span className="text-xs font-bold text-zinc-400 uppercase">Body Fat & Composition</span>
              <div className="flex items-center gap-2">
                {(bodyFatSynced || leanMassSynced) && <span className="text-[9px] text-emerald-400">🔗</span>}
                {compOpen ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
              </div>
            </button>
            {compOpen && (
              <div className="p-3 pt-0 space-y-3 border-t border-zinc-800/50">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-zinc-500">Body Fat %</label>
                    {bodyFatSynced && <span className="text-[8px] text-emerald-400">synced</span>}
                  </div>
                  <input type="number" inputMode="decimal" value={bodyFat} onChange={e => setBodyFat(e.target.value)} placeholder="—"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white text-center focus:border-orange-500 outline-none" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-zinc-500">Lean Body Mass (lbs)</label>
                    {leanMassSynced && <span className="text-[8px] text-emerald-400">synced</span>}
                  </div>
                  <input type="number" inputMode="decimal" value={leanMass} onChange={e => setLeanMass(e.target.value)} placeholder="—"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white text-center focus:border-orange-500 outline-none" />
                </div>
              </div>
            )}
          </div>

          {/* Circumferences — collapsible */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            <button onClick={() => setCircOpen(!circOpen)} className="w-full flex items-center justify-between p-3 hover:bg-zinc-800/50 transition">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase">Circumferences</span>
                {lastCircumferenceDate && <span className="text-[9px] text-zinc-600 ml-2">last: {lastCircumferenceDate}</span>}
              </div>
              {circOpen ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
            </button>
            {circOpen && (
              <div className="p-3 pt-0 grid grid-cols-2 gap-3 border-t border-zinc-800/50">
                {[
                  { label: 'Waist', val: waist, set: setWaist },
                  { label: 'Chest', val: chest, set: setChest },
                  { label: 'Arms', val: arms, set: setArms },
                  { label: 'Legs', val: legs, set: setLeg },
                  { label: 'Shoulders', val: shoulders, set: setShoulders },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <label className="text-[10px] text-zinc-500 mb-0.5 block">{label} (in)</label>
                    <input type="number" inputMode="decimal" value={val} onChange={e => set(e.target.value)} placeholder="—"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white text-center focus:border-orange-500 outline-none" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Save */}
        <div className="p-4 border-t border-zinc-800 shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-black uppercase text-sm rounded-xl tracking-wider disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? '...' : <><Check size={16} /> Save</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
