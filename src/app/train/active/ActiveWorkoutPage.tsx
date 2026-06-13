"use client";

import { useRouter } from 'next/navigation';
import BattleView from '@/components/v2/BattleView';

interface Props {
  userId: string;
  bodyweight: number;
  sex: string;
  age: number;
}

export default function ActiveWorkoutPage({ userId }: Props) {
  const router = useRouter();

  return (
    <BattleView
      userId={userId}
      onComplete={() => router.push('/train')}
    />
  );
}
