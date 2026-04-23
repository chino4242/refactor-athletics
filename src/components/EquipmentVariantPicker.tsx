"use client";

import type { CatalogItem } from '@/types';

const EQUIP_LABELS: Record<string, { emoji: string; label: string }> = {
  barbell: { emoji: '🏋️', label: 'BB' },
  dumbbells: { emoji: '🔩', label: 'DB' },
  smith_machine: { emoji: '🔧', label: 'Smith' },
};

interface Props {
  variants: CatalogItem[];
  selectedId: string;
  onSelect: (item: CatalogItem) => void;
}

export function getEquipmentVariants(exerciseName: string, catalog: CatalogItem[], exerciseId?: string): CatalogItem[] {
  const name = exerciseName.toLowerCase().trim();
  const match = catalog.find(c => c.name.toLowerCase() === name)
    || (exerciseId && catalog.find(c => c.id === exerciseId))
    || catalog.find(c => name.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(name));
  if (!match) return [];
  const baseId = match.normalizes_to || match.id;
  const variants = catalog.filter(c => c.id === baseId || c.normalizes_to === baseId);
  return variants.length > 1 ? variants : [];
}

export default function EquipmentVariantPicker({ variants, selectedId, onSelect }: Props) {
  if (variants.length === 0) return null;
  return (
    <div className="flex gap-1.5 flex-wrap">
      {variants.map(v => {
        const equip = v.required_equipment?.[0] || (v.normalizes_to ? 'variant' : 'barbell');
        const info = EQUIP_LABELS[equip] || { emoji: '🏋️', label: v.name.split('(')[0].trim().split(' ').pop() || 'Base' };
        return (
          <button
            key={v.id}
            onClick={(e) => { e.stopPropagation(); onSelect(v); }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
              v.id === selectedId
                ? 'bg-orange-500 text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >{info.emoji} {info.label}</button>
        );
      })}
    </div>
  );
}
