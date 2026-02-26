"use client";

import { useCallback } from 'react';
import { deleteHistoryItem, type HistoryItem } from '../services/api';


import { useUserProfileData } from '../hooks/useUserProfileData';
import { useTrophies } from '../hooks/useTrophies';
import { useToast } from '../context/ToastContext';

import CareerXpBar from './profile/CareerXpBar';
import ProfileCard from './profile/ProfileCard';

import PowerRadar from './profile/PowerRadar';
import TrophyList from './profile/TrophyList';
import MilestoneTable from './profile/MilestoneTable';
import StatsOverview from './profile/StatsOverview';
import ConfirmModal from './ConfirmModal';
import WeeklyReview from './WeeklyReview';

import { useState } from 'react';

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
      await deleteHistoryItem(userId, itemToDelete.timestamp);
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
  const [activeTab, setActiveTab] = useState<'stats' | 'milestones'>('stats');
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in-up space-y-8">

      {showWeeklyReview && (
        <WeeklyReview
          userId={userId}
          onClose={() => setShowWeeklyReview(false)}
        />
      )}

      <div className="mb-8">
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
      </div>

      {/* THE VAULT (Elevated) */}
      <div className="animate-fade-in-up delay-100">
        <PowerRadar stats={stats} categoryStats={categoryStats} />
      </div>

      {/* TABS */}
      <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-3 px-2 rounded-lg font-black italic uppercase tracking-wider transition-all text-[10px] md:text-sm ${activeTab === 'stats'
            ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
        >
          Stats & Trophies
        </button>
        <button
          onClick={() => setActiveTab('milestones')}
          className={`flex-1 py-3 px-2 rounded-lg font-black italic uppercase tracking-wider transition-all text-[10px] md:text-sm ${activeTab === 'milestones'
            ? 'bg-emerald-600/20 text-emerald-500 shadow-lg border border-emerald-500/30'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
        >
          Milestones
        </button>

        {/* Weekly Report Trigger */}
        <button
          onClick={() => setShowWeeklyReview(true)}
          className="flex-shrink-0 py-3 px-3 rounded-lg font-black italic uppercase tracking-wider transition-all text-[10px] md:text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 flex items-center gap-2 border border-transparent hover:border-zinc-700"
        >
          <span className="text-lg">📜</span>
          <span className="hidden md:inline">Weekly Report</span>
        </button>
      </div>

      {activeTab === 'stats' && (
        <div className="space-y-12 animate-fade-in-up">
          {/* SECTION 1: PROFILE & TRACKING */}
          <div>
            <CareerXpBar stats={stats} />
          </div>

          {/* STATS OVERVIEW */}
          <div className="mb-0">
            <StatsOverview stats={stats} />
          </div>

          {/* SECTION 2: TROPHIES */}
          <div>
            <h2 className="text-2xl font-black italic text-zinc-500 mb-6 flex items-center gap-3">
              <span className="w-8 h-1 bg-orange-600 rounded-full"></span>
              TROPHY COLLECTION
            </h2>

            <TrophyList
              groupedTrophies={groupedTrophies}
              categoryStats={categoryStats}
              sex={sex}
              currentTheme={currentTheme}
              onDelete={handleDeleteClick}
              getExerciseName={getExerciseName}
            />
          </div>
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="animate-fade-in-up">
          <h2 className="text-2xl font-black italic text-zinc-500 mb-6 flex items-center gap-3">
            <span className="w-8 h-1 bg-emerald-600 rounded-full"></span>
            NEXT MILESTONES
          </h2>
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
        message={`Are you sure you want to delete this record? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}