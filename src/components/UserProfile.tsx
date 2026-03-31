"use client";

import { useState, useCallback } from 'react';
import { type HistoryItem } from '../services/api';
import { deleteHistoryItemAction } from '@/app/actions';

import { useUserProfileData } from '../hooks/useUserProfileData';
import { useTrophies } from '../hooks/useTrophies';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
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
  const { history, stats, initialGoalWeight, loadUserData } = useUserProfileData(userId);
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
  const [activeTab, setActiveTab] = useState<'settings' | 'trophies' | 'milestones'>('settings');
  const [showThemes, setShowThemes] = useState(false);
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in-up space-y-6 p-4">

      {showWeeklyReview && (
        <WeeklyReview
          userId={userId}
          onClose={() => setShowWeeklyReview(false)}
        />
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest">{displayName}</h1>
          <p className="text-xs text-zinc-500">LVL {stats?.player_level || 1} · {stats?.total_career_xp || 0} XP</p>
        </div>
        <button
          onClick={() => setShowWeeklyReview(true)}
          className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition text-sm"
          title="Weekly Report"
        >
          📜
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800">
        {(['settings', 'trophies', 'milestones'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-2 rounded-lg font-black italic uppercase tracking-wider transition-all text-[10px] md:text-sm ${
              activeTab === tab
                ? tab === 'milestones' ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/30' : 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            {tab === 'settings' ? '⚙️ Settings' : tab === 'trophies' ? '🏆 Trophies' : '🎯 Milestones'}
          </button>
        ))}
      </div>

      {activeTab === 'settings' && (
        <div className="space-y-6 animate-fade-in-up">
          <ProfileCard
            displayName={displayName}
            userId={userId}
            age={age}
            sex={sex}
            currentWeight={currentWeight}
            goalWeight={initialGoalWeight}
            level={stats?.player_level || 1}
            onProfileUpdate={handleProfileUpdate}
            onReload={loadUserData}
          />

          {/* Theme Picker */}
          {(isClassic && !showThemes) ? (
          <button
              onClick={() => setShowThemes(true)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left hover:border-zinc-700 transition"
          >
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <span>🎨</span>
                      <span className="text-sm text-zinc-400">Customize Theme</span>
                  </div>
                  <span className="text-xs text-zinc-600">Optional</span>
              </div>
          </button>
          ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-sm font-black uppercase tracking-widest mb-4">🎨 Theme</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => setCurrentTheme(key)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-video ${activeTheme === key
                    ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                    : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <img src={`/themes/${key}/banner.png`} alt={theme.displayName} className="w-full h-full object-cover opacity-70" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-xs font-black uppercase tracking-wider leading-tight">{theme.emoji} {theme.displayName}</p>
                  </div>
                  {activeTheme === key && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center">
                      <span className="text-black text-xs font-black">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          )}
        </div>
      )}

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
        <div className="animate-fade-in-up">
          <div className="text-sm text-zinc-400 mb-6">
            Targets to reach the next Rank level based on your current stats.
          </div>
          <MilestoneTable
            userId={userId}
            age={age}
            sex={sex}
            bodyweight={currentWeight}
          />
        </div>
      )}

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