"use client";

import { useState } from 'react';
import { Upload, X, Loader2, Check } from 'lucide-react';

interface ScreenshotUploaderProps {
  type: 'workout' | 'nutrition' | 'habits' | 'fitness' | 'body_comp';
  subtype?: string;
  userId?: string;
  onDataExtracted: (data: any) => void;
}

const FLAT_TYPES = ['nutrition', 'habits', 'fitness', 'body_comp'];

export default function ScreenshotUploader({ type, subtype, userId, onDataExtracted }: ScreenshotUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<Record<string, string> | null>(null);
  const [imageDescription, setImageDescription] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);
      if (subtype) formData.append('subtype', subtype);

      const response = await fetch('/api/parse-screenshot', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        const { image_description, ...data } = { image_description: result.image_description, ...result.data };
        setImageDescription(image_description || '');
        setPreview(null);

        if (FLAT_TYPES.includes(type)) {
          // Show review step for flat data
          const review: Record<string, string> = {};
          Object.entries(data).forEach(([k, v]) => {
            if (k !== '_image_description' && v != null) review[k] = String(v);
          });
          setReviewData(review);
        } else {
          // Workout type — pass through directly (has its own edit flow)
          onDataExtracted(data);
        }
      } else {
        alert(`Failed to parse screenshot: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Failed to upload screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = () => {
    if (!reviewData) return;
    const cleaned: Record<string, number> = {};
    Object.entries(reviewData).forEach(([k, v]) => { if (v) cleaned[k] = Number(v); });

    // Save as few-shot example
    if (userId && imageDescription) {
      const screenshotType = type === 'body_comp' ? `body_comp_${subtype || 'tape'}` : type;
      fetch('/api/screenshot-examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          screenshot_type: screenshotType,
          image_description: imageDescription,
          corrected_json: cleaned,
        }),
      }).catch(console.error);
    }

    onDataExtracted(cleaned);
    setReviewData(null);
  };

  return (
    <div className="relative">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id={`screenshot-upload-${type}`}
        disabled={uploading}
      />
      <label
        htmlFor={`screenshot-upload-${type}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors min-h-[36px] ${
          uploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {uploading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs text-zinc-400">Parsing...</span>
          </>
        ) : (
          <>
            <Upload size={14} className="text-orange-500" />
            <span className="text-xs text-zinc-400 font-bold uppercase tracking-wide">
              {type === 'habits' ? '📱 Upload Habits' : 'Upload'}
            </span>
          </>
        )}
      </label>

      {preview && !reviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative max-w-2xl">
            <button onClick={() => setPreview(null)} className="absolute -top-10 right-0 text-white hover:text-red-500">
              <X size={24} />
            </button>
            <img src={preview} alt="Preview" className="rounded-lg max-h-[80vh]" />
          </div>
        </div>
      )}

      {reviewData && (
        <div className="mt-2 bg-zinc-800/80 border border-emerald-800/50 rounded-xl p-3 space-y-2">
          <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">Review Extracted Data</p>
          {Object.entries(reviewData).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 uppercase w-24 truncate">{key.replace(/_/g, ' ')}</span>
              <input
                type="number"
                step="0.1"
                value={val}
                onChange={(e) => setReviewData({ ...reviewData, [key]: e.target.value })}
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-white text-center outline-none focus:border-emerald-600"
              />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setReviewData(null)}
              className="flex-1 text-xs text-zinc-400 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 font-bold uppercase"
            >Cancel</button>
            <button
              onClick={handleConfirm}
              className="flex-1 text-xs text-white py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 font-bold uppercase flex items-center justify-center gap-1"
            ><Check size={12} /> Confirm</button>
          </div>
        </div>
      )}
    </div>
  );
}
