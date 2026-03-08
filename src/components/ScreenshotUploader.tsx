"use client";

import { useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';

interface ScreenshotUploaderProps {
  type: 'workout' | 'nutrition' | 'habits';
  onDataExtracted: (data: any) => void;
}

export default function ScreenshotUploader({ type, onDataExtracted }: ScreenshotUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload and parse
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);

      const response = await fetch('/api/parse-screenshot', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        onDataExtracted(result.data);
        setPreview(null);
      } else {
        alert('Failed to parse screenshot');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload screenshot');
    } finally {
      setUploading(false);
    }
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
        className={`flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors ${
          uploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm text-zinc-400">Parsing...</span>
          </>
        ) : (
          <>
            <Upload size={16} className="text-orange-500" />
            <span className="text-sm text-zinc-300">Upload Screenshot</span>
          </>
        )}
      </label>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative max-w-2xl">
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-10 right-0 text-white hover:text-red-500"
            >
              <X size={24} />
            </button>
            <img src={preview} alt="Preview" className="rounded-lg max-h-[80vh]" />
          </div>
        </div>
      )}
    </div>
  );
}
