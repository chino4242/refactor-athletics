"use client";

import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import type { FoodResult } from '@/app/api/food-search/route';

interface Props {
  onResult: (food: FoodResult) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onResult, onClose }: Props) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const lookingRef = useRef(false);
  const mountedRef = useRef(true);
  const [error, setError] = useState('');
  const [looking, setLooking] = useState(false);

  useEffect(() => {
    mountedRef.current = true;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mountedRef.current || !scannerRef.current) return;

        const scanner = new Html5Qrcode('barcode-reader');
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 100 }, aspectRatio: 1.5 },
          async (decodedText) => {
            if (lookingRef.current) return;
            lookingRef.current = true;
            if (mountedRef.current) setLooking(true);

            try { await scanner.stop(); } catch {}

            try {
              const res = await fetch(`/api/food-search?barcode=${encodeURIComponent(decodedText)}`);
              if (!mountedRef.current) return;
              const data = await res.json();
              if (data.results?.length > 0) {
                onResult(data.results[0]);
                return;
              }
              setError(`No food found for barcode: ${decodedText}`);
            } catch {
              if (mountedRef.current) setError('Lookup failed. Try again.');
            }

            // Reset and restart
            lookingRef.current = false;
            if (mountedRef.current) setLooking(false);
            try {
              if (mountedRef.current) {
                await scanner.start(
                  { facingMode: 'environment' },
                  { fps: 10, qrbox: { width: 250, height: 100 }, aspectRatio: 1.5 },
                  () => {},
                  () => {}
                );
              }
            } catch {}
          },
          () => {}
        );
      } catch (err: any) {
        if (mountedRef.current) setError(err?.message || 'Camera access denied');
      }
    };

    startScanner();

    return () => {
      mountedRef.current = false;
      try { html5QrCodeRef.current?.stop().catch(() => {}); } catch {}
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/80">
        <div className="flex items-center gap-2 text-white">
          <Camera size={18} />
          <span className="text-base font-bold">Scan Barcode</span>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white p-2">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div id="barcode-reader" ref={scannerRef} className="w-full max-w-sm" />
      </div>

      {looking && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <p className="text-white text-base font-bold animate-pulse">Looking up product...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-950/50 border-t border-red-900">
          <p className="text-red-400 text-xs text-center">{error}</p>
        </div>
      )}

      <div className="p-4 bg-black/80">
        <p className="text-zinc-500 text-xs text-center">Point camera at a product barcode</p>
      </div>
    </div>
  );
}
