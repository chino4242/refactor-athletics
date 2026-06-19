"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import BattleView from '@/components/v2/BattleView';

interface Props {
  userId: string;
  bodyweight: number;
  sex: string;
  age: number;
}

export default function ActiveWorkoutPage({ userId }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get('mode');
  const filter = params.get('filter');
  const exercise = params.get('exercise');
  const day = params.get('day');
  const session = params.get('session');

  return (
    <BattleView
      userId={userId}
      onComplete={() => router.push('/train')}
      flexibleMode={mode === 'flexible'}
      filter={session || filter || undefined}
      singleExercise={exercise || undefined}
      overrideDay={day || undefined}
    />
  );
}
