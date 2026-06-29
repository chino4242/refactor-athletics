"use client";

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  userId: string;
  onClose: () => void;
  initialMessage?: string;
}

export default function NutritionCoach({ userId, onClose, initialMessage }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [applying, setApplying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Start conversation with coach greeting
    const opener = initialMessage
      ? initialMessage
      : "I'd like help setting my macro targets based on my body composition and goals.";
    
    const initMessages: Message[] = [{ role: 'user', content: opener }];
    setMessages(initMessages);
    setStreaming(true);

    (async () => {
      try {
        const res = await fetch('/api/nutrition-coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, messages: initMessages }),
        });
        if (!res.ok || !res.body) { setStreaming(false); return; }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = '';
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const { text } = JSON.parse(line.slice(6));
                assistantText += text;
                setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: assistantText }]);
              } catch {}
            }
          }
        }
      } catch {}
      setStreaming(false);
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch('/api/nutrition-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, messages: newMessages }),
      });

      if (!res.ok || !res.body) { setStreaming(false); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const { text } = JSON.parse(line.slice(6));
              assistantText += text;
              setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: assistantText }]);
            } catch {}
          }
        }
      }
    } catch {}
    setStreaming(false);
  };

  const handleApply = async (recommendation: { protein: number; carbs: number; fat: number; calories: number }) => {
    setApplying(true);
    try {
      const { saveProfile } = await import('@/services/api');
      await saveProfile({ user_id: userId, nutrition_targets: recommendation } as any);
      setMessages(prev => [...prev, { role: 'assistant', content: '✅ Targets applied! Your Fuel screen will now use these goals.' }]);
    } catch {}
    setApplying(false);
  };

  // Extract recommendation JSON from last assistant message
  // Extract recommendation JSON from any assistant message (check most recent first)
  let recommendation: { protein: number; carbs: number; fat: number; calories: number } | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== 'assistant') continue;
    const recMatch = messages[i].content.match(/```json\s*([\s\S]*?)```/);
    if (recMatch) {
      try {
        const parsed = JSON.parse(recMatch[1].trim());
        if (parsed.recommended) { recommendation = parsed.recommended; break; }
      } catch {}
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-zinc-950">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${colors.border}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <span className="text-sm text-white font-medium">Nutrition Coach</span>
        </div>
        <button onClick={onClose} className="text-zinc-400 text-sm px-2 py-1">✕</button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? `${colors.border} border bg-zinc-800 text-white`
                : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
            }`}>
              {(msg.content || (streaming && i === messages.length - 1 ? '...' : '')).replace(/```json[\s\S]*?```/g, '').trim()}
            </div>
          </div>
        ))}

        {/* Apply recommendation card */}
        {recommendation && !applying && (
          <div className={`border ${colors.primary} bg-zinc-800 p-3 space-y-2`}>
            <p className="text-[9px] text-zinc-400 uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>RECOMMENDED TARGETS</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div><p className="text-sm text-white font-bold">{recommendation.protein}g</p><p className="text-[8px] text-zinc-500">Protein</p></div>
              <div><p className="text-sm text-white font-bold">{recommendation.carbs}g</p><p className="text-[8px] text-zinc-500">Carbs</p></div>
              <div><p className="text-sm text-white font-bold">{recommendation.fat}g</p><p className="text-[8px] text-zinc-500">Fat</p></div>
              <div><p className="text-sm text-white font-bold">{recommendation.calories}</p><p className="text-[8px] text-zinc-500">Cal</p></div>
            </div>
            <button onClick={() => handleApply(recommendation!)} className={`w-full py-2 border ${colors.primary} bg-zinc-900 text-center`}>
              <span className="text-[10px] text-green-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>✓ APPLY TARGETS</span>
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`px-4 py-3 border-t ${colors.border} flex gap-2`}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && input.trim() && !streaming) sendMessage(input.trim()); }}
          placeholder="Ask the coach..."
          className="flex-1 bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none"
          disabled={streaming}
        />
        <button
          onClick={() => { if (input.trim() && !streaming) sendMessage(input.trim()); }}
          disabled={!input.trim() || streaming}
          className={`px-4 border ${colors.primary} bg-zinc-800 disabled:opacity-50`}
        >
          <span className="text-sm">▸</span>
        </button>
      </div>
    </div>
  );
}
