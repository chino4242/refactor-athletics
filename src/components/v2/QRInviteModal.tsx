"use client";

import { useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

interface Props {
  code: string;
  partyName?: string;
  memberCount?: number;
  onClose: () => void;
}

export default function QRInviteModal({ code, partyName, memberCount, onClose }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = `https://refactorathletics.com/join/${code}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    generateQR(canvasRef.current, url);
  }, [url]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/90" />
      <div className="relative text-center space-y-4 p-8" onClick={e => e.stopPropagation()}>
        {partyName && (
          <p className="text-sm text-white font-medium" style={{ fontFamily: "var(--font-pixel), monospace" }}>{partyName}</p>
        )}
        {memberCount !== undefined && (
          <p className="text-[10px] text-zinc-400">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
        )}
        <div className="bg-white p-4 rounded-lg inline-block">
          <canvas ref={canvasRef} width={200} height={200} />
        </div>
        <p className="text-[9px] text-zinc-500 break-all max-w-[250px] mx-auto">{url}</p>
        <p className="text-[8px] text-zinc-600 mt-4">Scan to join · tap anywhere to close</p>
      </div>
    </div>
  );
}

// Minimal QR code generator (uses QR encoding via URL to a public API as fallback,
// or generates a simple representation)
function generateQR(canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Use Google Charts QR API via image load
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.drawImage(img, 0, 0, 200, 200);
  };
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
}
