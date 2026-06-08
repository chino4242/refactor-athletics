'use client';

import { useState, useRef } from 'react';
import { Camera, Search, Loader2 } from 'lucide-react';
import type { FoodResult } from '@/app/api/food-search/route';

interface NutritionInputProps {
  onFoodsFound: (foods: FoodResult[]) => void;
  onSearchResults: (foods: FoodResult[]) => void;
  onPhotoFoods: (foods: FoodResult[]) => void;
}

/** Returns true if running inside Capacitor native shell */
function isNative(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
}

/** Request camera permission on native, returns true if granted */
async function requestCameraPermission(): Promise<boolean> {
  if (!isNative()) return true; // web always has access via file input
  try {
    const mod = await (Function('return import("@capacitor/camera")')() as Promise<any>);
    const result = await mod.Camera.requestPermissions({ permissions: ['camera'] });
    return result.camera === 'granted' || result.camera === 'limited';
  } catch {
    // Plugin not available — allow attempt (browser/webview will prompt)
    return true;
  }
}

export default function NutritionInput({ onFoodsFound, onSearchResults, onPhotoFoods }: NutritionInputProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Smart routing: short single food name → search, longer description → AI parse
  const isDescriptive = (text: string) => {
    const words = text.trim().split(/\s+/).length;
    const hasComma = text.includes(',');
    const hasAnd = /\band\b/i.test(text);
    return words >= 4 || hasComma || hasAnd;
  };

  const handleSubmit = async () => {
    const text = query.trim();
    if (!text || loading) return;
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (isDescriptive(text)) {
        // AI parse — multi-food description
        const res = await fetch('/api/food-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.foods?.length) {
          onFoodsFound(data.foods);
          setQuery('');
        }
      } else {
        // Food search — single item lookup (show picker)
        const res = await fetch(`/api/food-search?q=${encodeURIComponent(text)}`, { signal: controller.signal });
        const data = await res.json();
        if (data.results?.length) {
          onSearchResults(data.results);
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.error('Nutrition input error:', e);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleCamera = async () => {
    const granted = await requestCameraPermission();
    if (!granted) {
      alert('Camera permission is required to take food photos. Please enable it in your device settings.');
      return;
    }
    fileRef.current?.click();
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', 'meal_photo');
      const res = await fetch('/api/parse-screenshot', { method: 'POST', body: formData });
      if (!res.ok) return;
      const json = await res.json();
      if (json.data?.foods?.length) {
        const foods: FoodResult[] = json.data.foods.map((item: any) => ({
          id: `photo_${item.name?.replace(/\s+/g, '_').toLowerCase()}`,
          name: item.name,
          source: 'usda' as const,
          servingSize: '1 serving',
          per100g: { calories: item.calories || 0, protein: item.protein || 0, carbs: item.carbs || 0, fat: item.fat || 0 },
        }));
        onPhotoFoods(foods);
        setQuery('');
      }
    } catch (e) {
      console.error('Photo parse failed:', e);
    } finally {
      setPhotoLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="What did you eat?"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-500 transition"
          />
          {loading ? (
            <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-400 animate-spin" />
          ) : query.trim() && (
            <button onClick={handleSubmit} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-orange-400">
              <Search size={16} />
            </button>
          )}
        </div>
        <button
          onClick={handleCamera}
          disabled={photoLoading}
          className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 hover:border-zinc-600 transition flex items-center justify-center disabled:opacity-50"
        >
          {photoLoading ? <Loader2 size={18} className="text-orange-400 animate-spin" /> : <Camera size={18} className="text-zinc-400" />}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
      {isDescriptive(query) && query.trim().length > 5 && (
        <p className="text-[10px] text-zinc-500 px-1">⚡ AI will estimate macros for your full meal</p>
      )}
    </div>
  );
}
