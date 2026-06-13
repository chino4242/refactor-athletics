"use client";

import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`bg-zinc-800 animate-pulse ${className}`} />;
}

export function PowerLevelSkeleton() {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  return (
    <div className={`min-h-screen ${colors.bgTint} pb-24 px-3 pt-4`}>
      <SkeletonBox className="w-full h-32 mb-4 border border-zinc-800" />
      <SkeletonBox className="w-full h-8 mb-4" />
      <div className="border border-zinc-800 bg-zinc-900 p-5 mb-4">
        <SkeletonBox className="w-20 h-3 mx-auto mb-3" />
        <SkeletonBox className="w-16 h-10 mx-auto mb-3" />
        <SkeletonBox className="w-full h-3" />
      </div>
      <div className="border border-zinc-800 bg-zinc-900 p-4 mb-4 space-y-2">
        <SkeletonBox className="w-24 h-3" />
        <SkeletonBox className="w-full h-6" />
        <SkeletonBox className="w-full h-6" />
      </div>
    </div>
  );
}

export function TrainSkeleton() {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  return (
    <div className={`min-h-screen ${colors.bgTint} pb-24 px-3 pt-4`}>
      <SkeletonBox className="w-12 h-3 mb-4" />
      <div className="border border-zinc-800 bg-zinc-900 p-3 mb-4">
        <SkeletonBox className="w-20 h-2 mb-2" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => <SkeletonBox key={i} className="w-6 h-6" />)}
        </div>
      </div>
      <div className="border border-zinc-800 bg-zinc-900 p-4 mb-4 space-y-2">
        <SkeletonBox className="w-28 h-3" />
        <SkeletonBox className="w-full h-4" />
        <SkeletonBox className="w-40 h-3" />
        <SkeletonBox className="w-24 h-8 ml-auto" />
      </div>
      <div className="border border-zinc-800 bg-zinc-900 p-4 space-y-2">
        <SkeletonBox className="w-16 h-2" />
        <SkeletonBox className="w-full h-10" />
      </div>
    </div>
  );
}

export function ArenaSkeleton() {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  return (
    <div className={`min-h-screen ${colors.bgTint} pb-24 px-3 pt-4`}>
      <SkeletonBox className="w-12 h-3 mb-4" />
      <div className="border border-zinc-800 bg-zinc-900 p-4 mb-4 space-y-2">
        <SkeletonBox className="w-20 h-3" />
        <SkeletonBox className="w-full h-16" />
      </div>
      <div className="border border-zinc-800 bg-zinc-900 p-4 mb-4 space-y-3">
        <SkeletonBox className="w-28 h-3" />
        <SkeletonBox className="w-full h-20" />
        <SkeletonBox className="w-full h-20" />
        <SkeletonBox className="w-full h-20" />
      </div>
      <div className="border border-zinc-800 bg-zinc-900 p-4 space-y-2">
        <SkeletonBox className="w-20 h-3" />
        <SkeletonBox className="w-full h-12" />
      </div>
    </div>
  );
}
