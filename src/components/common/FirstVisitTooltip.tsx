'use client';

import { useState, useEffect } from 'react';

interface FirstVisitTooltipProps {
  id: string;
  message: string;
}

export default function FirstVisitTooltip({ id, message }: FirstVisitTooltipProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const key = `tooltip_seen_${id}`;
    if (!localStorage.getItem(key)) {
      setShow(true);
    }
  }, [id]);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(`tooltip_seen_${id}`, 'true');
    setShow(false);
  };

  return (
    <div onClick={dismiss} className="mx-4 mb-3 px-4 py-3 bg-zinc-800/80 border border-zinc-700/50 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 cursor-pointer">
      <span className="text-lg">💡</span>
      <p className="text-xs text-zinc-300 flex-1">{message}</p>
      <span className="text-[10px] text-zinc-600 shrink-0">tap to dismiss</span>
    </div>
  );
}
