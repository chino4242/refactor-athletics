"use client";

import { useState, useCallback } from 'react';
import { type HistoryItem } from '../services/api';
import { deleteHistoryItemAction } from '@/app/actions';

import { useUserProfileData } from '../hooks/useUserProfileData';
import { useTrophies } from '../hooks/useTrophies';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import RewardsTrack from './RewardsTrack';
import { useExperienceMode } from '../context/ExperienceModeContext';
import { THEMES } from '../data/themes';

import ProfileCard from './profile/ProfileCard';
import TrophyList from './profile/TrophyList';
import MilestoneTable from './profile/MilestoneTable';
import ConfirmModal from './ConfirmModal';
import WeeklyReview from './WeeklyReview';

interface UserProfileProps {
  displayName: string;
  userId: string;
  age: number;
  sex: string;
  currentWeight: number;
  exercises: any[];
  currentTheme: string;
  history?: any[];
  onWeightUpdate?: (newWeight: number) => void;
  onProfileUpdate?: (age: number, sex: string) => void;
}

export default function UserProfile({
  displayName,
  userId,
  age,
  sex,
  currentWeight,
  exercises,
  currentTheme,
  onWeightUpdate = () => { },
  onProfileUpdate = () => { },
}: UserProfileProps) {

  // --- HOOKS ---
  const { history, stats, initialGoalWeight, measurementMode, loadUserData } = useUserProfileData(userId);
  const { groupedTrophies, categoryStats } = useTrophies(history, exercises);
  const toast = useToast();
  const { currentTheme: activeTheme, setCurrentTheme } = useTheme();
  const { isClassic } = useExperienceMode();
  const [itemToDelete, setItemToDelete] = useState<HistoryItem | null>(null);

  // --- HANDLERS ---
  const handleProfileUpdate = useCallback((newWeight: number, newAge: number, newSex: string) => {
    onWeightUpdate(newWeight);
    onProfileUpdate(newAge, newSex);
    loadUserData();
  }, [onWeightUpdate, onProfileUpdate, loadUserData]);

  const handleDeleteClick = (item: HistoryItem) => {
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteHistoryItemAction(userId, itemToDelete.timestamp);
      toast.success("Record deleted.");
      loadUserData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete item.");
    } finally {
      setItemToDelete(null);
    }
  };

  const getExerciseName = (id: string) => {
    const found = exercises.find(e => e.id === id);
    return found ? found.displayName : id;
  };



  // --- TAB STATE ---
  const [activeTab, setActiveTab] = useState<'trophies' | 'milestones'>('trophies');
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);

  const theme = THEMES[activeTheme] || THEMES.athlete;
  const tier = (() => { const thresholds = [0, 5, 15, 30, 50, 80]; for (let i = thresholds.length - 1; i >= 0; i--) { if ((stats?.power_level || 0) >= thresholds[i]) return i; } return 0; })();
  const rankImage = theme.ranks?.[`level${tier}`]?.image;
  const rankName = theme.ranks?.[`level${tier}`]?.name?.split(': ')[1] || '';

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in-up space-y-0">

      {showWeeklyReview && (
        <WeeklyReview userId={userId} onClose={() => setShowWeeklyReview(false)} />
      )}

      {/* Hero Banner — Character Identity */}
      <section className="relative w-full h-52 overflow-hidden rounded-b-2xl">
        <img src={`/themes/${activeTheme}/banner.png`} alt="" className="absolute inset-0 w-full h-full object-cover object-[center_20%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 flex items-end gap-4">
          {rankImage && <img src={rankImage} alt={rankName} className="w-16 h-16 object-contain" />}
          <div className="flex-1">
            <h1 className="text-2xl font-black text-white uppercase tracking-wide">{displayName}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-bold" style={{ color: theme.accentHex }}>{rankName || `Tier ${tier}`}</span>
              <span className="text-[10px] text-zinc-400">Lv {stats?.player_level || 1}</span>
              <span className="text-[10px] text-zinc-500">{stats?.total_career_xp || 0} XP</span>
            </div>
          </div>
          <button onClick={() => setShowWeeklyReview(true)} className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-700/50 text-sm" title="Weekly Report">📜</button>
        </div>
      </section>

      {/* Stats Row */}
      <div className="flex items-center justify-around px-4 py-4 bg-zinc-900 border-b border-zinc-800">
        <div className="text-center">
          <div className="text-lg font-black text-white">{stats?.power_level || 0}</div>
          <div className="text-[9px] text-zinc-500 uppercase font-bold">{isClassic ? 'Score' : 'Power'}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-black text-white">{stats?.exercises_tracked || 0}</div>
          <div className="text-[9px] text-zinc-500 uppercase font-bold">Ranked</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-black text-white">{currentWeight}</div>
          <div className="text-[9px] text-zinc-500 uppercase font-bold">lbs</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-black text-white">{stats?.player_level || 1}</div>
          <div className="text-[9px] text-zinc-500 uppercase font-bold">Level</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-3 px-4">
        {(['trophies', 'milestones'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-2 rounded-xl font-bold uppercase tracking-wider transition-all text-xs ${
              activeTab === tab
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
            style={activeTab === tab ? { color: theme.accentHex } : {}}
          >
            {tab === 'trophies' ? '🏆 Trophies' : '🎯 Milestones'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4 pb-8">
        {activeTab === 'trophies' && (
          <div className="space-y-6 animate-fade-in-up">
            <TrophyList
              groupedTrophies={groupedTrophies}
              categoryStats={categoryStats}
              sex={sex}
              currentTheme={currentTheme}
              onDelete={handleDeleteClick}
              getExerciseName={getExerciseName}
            />
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="animate-fade-in-up space-y-4">
            <RewardsTrack playerLevel={stats?.player_level || 1} />
            <div className="text-sm text-zinc-400 mb-2">
              Targets to reach the next Rank level based on your current stats.
            </div>
            <MilestoneTable userId={userId} age={age} sex={sex} bodyweight={currentWeight} />
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Record?"
        message="Are you sure you want to delete this record? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}