"use client";

import { useState } from 'react';
import { Calculator, X, Minus, Plus } from 'lucide-react';

const BAR_PRESETS = [
  { label: 'Barbell', weight: 45 },
  { label: 'Smith', weight: 25 },
];

const PLATES = [45, 35, 25, 10, 5, 2.5];

interface Props {
  onUse: (weight: number) => void;
}

export default function WeightCalculator({ onUse }: Props) {
  const [open, setOpen] = useState(false);
  const [barWeight, setBarWeight] = useState(45);
  const [plates, setPlates] = useState<Record<number, number>>({});

  const plateTotal = Object.entries(plates).reduce((sum, [w, count]) => sum + parseFloat(w) * count * 2, 0);
  const total = barWeight + plateTotal;

  const adjust = (plate: number, delta: number) => {
    setPlates(prev => {
      const count = Math.max(0, (prev[plate] || 0) + delta);
      return { ...prev, [plate]: count };
    });
  };

  const reset = () => { setPlates({}); setBarWeight(45); };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition text-xs font-bold" title="Plate Calculator">
        <Calculator size={14} />
        <span>Plate Calculator</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={() => setOpen(false)}>
      <div className="bg-zinc-900 border-t border-zinc-700 rounded-t-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Plate Calculator</h3>
          <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
        </div>

        {/* Bar selection */}
        <div>
          <span className="text-xs text-zinc-500 uppercase font-bold">Bar</span>
          <div className="flex gap-2 mt-1">
            {BAR_PRESETS.map(b => (
              <button key={b.label} onClick={() => setBarWeight(b.weight)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${barWeight === b.weight ? 'bg-orange-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                {b.label} ({b.weight})
              </button>
            ))}
            <input type="text" inputMode="decimal" value={barWeight} onChange={e => setBarWeight(parseFloat(e.target.value) || 0)}
              className="w-16 bg-zinc-800 text-white border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-center font-mono focus:border-zinc-500 focus:outline-none" />
          </div>
        </div>

        {/* Plates per side */}
        <div>
          <span className="text-xs text-zinc-500 uppercase font-bold">Plates (per side)</span>
          <div className="space-y-2 mt-1">
            {PLATES.map(p => (
              <div key={p} className="flex items-center justify-between">
                <span className="text-base text-zinc-300 font-mono w-12">{p}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => adjust(p, -1)} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition">
                    <Minus size={14} />
                  </button>
                  <span className="text-white font-bold font-mono w-6 text-center">{plates[p] || 0}</span>
                  <button onClick={() => adjust(p, 1)} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total + actions */}
        <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-500 uppercase font-bold">Total</span>
            <div className="text-2xl font-black text-white">{total} <span className="text-sm text-zinc-500">lbs</span></div>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="px-3 py-2 text-xs font-bold text-zinc-500 hover:text-white transition">Reset</button>
            <button onClick={() => { onUse(total); setOpen(false); }}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition">
              Use Weight
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
