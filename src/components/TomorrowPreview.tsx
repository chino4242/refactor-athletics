'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface TomorrowPreviewProps {
  userId: string;
}

export default function TomorrowPreview({ userId }: TomorrowPreviewProps) {
  const [workout, setWorkout] = useState<{ name: string; type: string; blockCount: number } | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 20) return; // Only show after 8 PM

    const fetchTomorrow = async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toLocaleDateString('en-CA');
      try {
        const res = await fetch(`/api/workout?date=${dateStr}`);
        const blocks = await res.json();
        if (blocks?.length > 0) {
          const hasTimer = blocks.some((b: any) => b.type === 'timer');
          const hasExercise = blocks.some((b: any) => b.type === 'checklist_exercise' || b.type === 'superset');
          const type = hasTimer && hasExercise ? 'Hybrid' : hasTimer ? 'Cardio' : 'Strength';
          const name = blocks[0]?.section || 'Workout';
          setWorkout({ name, type, blockCount: blocks.length });
        }
      } catch {}
    };
    fetchTomorrow();
  }, [userId]);

  if (!workout) return null;

  return (
    <Link href="/train" className="block bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 transition mt-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Tomorrow</div>
          <div className="text-base font-bold text-white mt-0.5">{workout.type} Day</div>
          <div className="text-xs text-zinc-500">{workout.blockCount} blocks</div>
        </div>
        <ChevronRight size={16} className="text-zinc-600" />
      </div>
    </Link>
  );
}
