'use client';

import { useState, useEffect } from 'react';
import { Plus, RotateCcw, Users, Check, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const APP_METRICS = [
  { id: 'workout_count', label: 'Workouts', unit: 'per day', defaultMin: 1 },
  { id: 'habit_steps', label: 'Steps', unit: 'steps', defaultMin: 10000 },
  { id: 'active_minutes', label: 'Active Minutes', unit: 'min', defaultMin: 30 },
  { id: 'habit_water', label: 'Water', unit: 'oz', defaultMin: 64 },
  { id: 'macro_protein', label: 'Protein', unit: 'g', defaultMin: 150 },
  { id: 'habit_sleep', label: 'Sleep', unit: 'hrs', defaultMin: 7 },
  { id: 'macro_calories', label: 'Calories (max)', unit: 'kcal', defaultMin: 2500 },
];

interface Challenge {
  id: string; title: string; status: string; start_date: string;
  failed_on: string | null; failed_by: string | null; failed_metric: string | null;
  completed_at: string | null; group_id: string | null;
  challenge_75_metrics: any[]; challenge_75_members: any[]; challenge_75_days: any[];
}

export default function Challenge75Client({ userId, groups }: { userId: string; groups: any[] }) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [joinableChallenge, setJoinableChallenge] = useState<any | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const res = await fetch('/api/challenge-75');
    if (res.ok) {
      const data = await res.json();
      setChallenges(data.challenges || []);
      // Show first joinable challenge if any
      if (data.joinable?.length > 0 && !joinableChallenge) setJoinableChallenge(data.joinable[0]);
    }
    setLoading(false);
  };

  if (loading) return <div className="text-center py-8 text-zinc-500">Loading...</div>;

  if (selectedChallenge) return <ChallengeView challenge={selectedChallenge} userId={userId} onBack={() => { setSelectedChallenge(null); load(); }} />;
  if (joinableChallenge) return <JoinChallenge challenge={joinableChallenge} userId={userId} onDone={() => { setJoinableChallenge(null); load(); }} onSkip={() => setJoinableChallenge(null)} />;
  if (showCreate) return <CreateChallenge userId={userId} groups={groups} onDone={() => { setShowCreate(false); load(); }} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white uppercase">75 Day Challenge</h1>
        <button onClick={() => setShowCreate(true)} className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5">
          <Plus size={14} /> New
        </button>
      </div>

      {challenges.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="text-4xl">🎯</div>
          <p className="text-zinc-400 text-sm">No active challenges yet.</p>
          <button onClick={() => setShowCreate(true)} className="bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-lg">Start Your First Challenge</button>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map(c => {
            const daysPassed = Math.max(0, Math.floor((Date.now() - new Date(c.start_date).getTime()) / 86400000));
            const passedDays = (c.challenge_75_days || []).filter((d: any) => d.user_id === userId && d.status === 'passed').length;
            return (
              <button key={c.id} onClick={() => setSelectedChallenge(c)} className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-white">{c.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : c.status === 'completed' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                    {c.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                  <span>Day {Math.min(daysPassed, 75)}/75</span>
                  <span>✅ {passedDays} days</span>
                  {c.group_id && <span className="flex items-center gap-1"><Users size={10} /> Group</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const TEMPLATES = [
  {
    id: 'full_send',
    name: 'Full Send',
    emoji: '🔥',
    description: 'No compromises. Train, eat right, and build habits daily.',
    defaultTitle: '75 Day Full Send',
    metrics: [
      { id: 'workout_count', label: 'Workouts', type: 'app', minimum: 1 },
      { id: 'habit_steps', label: 'Steps', type: 'app', minimum: 10000 },
      { id: 'habit_water', label: 'Water', type: 'app', minimum: 64 },
      { id: 'macro_protein', label: 'Protein', type: 'app', minimum: 150 },
      { id: 'habit_sleep', label: 'Sleep', type: 'app', minimum: 7 },
      { id: 'custom_read', label: 'Read 10 pages', type: 'custom', minimum: 0 },
      { id: 'custom_no_alcohol', label: 'No alcohol', type: 'custom', minimum: 0 },
    ],
  },
  {
    id: 'foundation',
    name: 'Foundation',
    emoji: '🧱',
    description: 'Build consistency with the basics — sustainable and effective.',
    defaultTitle: '75 Day Foundation',
    metrics: [
      { id: 'workout_count', label: 'Workouts', type: 'app', minimum: 1 },
      { id: 'habit_steps', label: 'Steps', type: 'app', minimum: 7500 },
      { id: 'habit_water', label: 'Water', type: 'app', minimum: 64 },
      { id: 'habit_sleep', label: 'Sleep', type: 'app', minimum: 7 },
    ],
  },
];

function CreateChallenge({ userId, groups, onDone }: { userId: string; groups: any[]; onDone: () => void }) {
  const [title, setTitle] = useState('75 Day Challenge');
  const [selectedMetrics, setSelectedMetrics] = useState<{ id: string; label: string; type: string; minimum: number }[]>([]);
  const [customLabel, setCustomLabel] = useState('');
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [groupId, setGroupId] = useState<string | null>(null);
  const [sharedFailure, setSharedFailure] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'pick' | 'build'>('pick');

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setTitle(t.defaultTitle);
    setSelectedMetrics(t.metrics);
    setStep('build');
  };

  const toggleMetric = (m: typeof APP_METRICS[0]) => {
    setSelectedMetrics(prev => prev.some(s => s.id === m.id)
      ? prev.filter(s => s.id !== m.id)
      : [...prev, { id: m.id, label: m.label, type: 'app', minimum: m.defaultMin }]);
  };

  const addCustom = () => {
    if (!customLabel.trim()) return;
    const id = `custom_${customLabel.trim().toLowerCase().replace(/\s+/g, '_')}`;
    setSelectedMetrics(prev => [...prev, { id, label: customLabel.trim(), type: 'custom', minimum: 0 }]);
    setCustomLabel('');
  };

  const updateMinimum = (id: string, val: number) => {
    setSelectedMetrics(prev => prev.map(m => m.id === id ? { ...m, minimum: val } : m));
  };

  const handleCreate = async () => {
    if (selectedMetrics.length === 0) return;
    setSaving(true);
    await fetch('/api/challenge-75', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', title, start_date: startDate, group_id: groupId, shared_failure: sharedFailure, metrics: selectedMetrics }),
    });
    onDone();
  };

  // Step 1: Template picker
  if (step === 'pick') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">New Challenge</h2>
          <button onClick={onDone} className="text-zinc-500 text-xs">Cancel</button>
        </div>

        <p className="text-sm text-zinc-400">Choose a template to get started, or build your own from scratch.</p>

        <div className="space-y-3">
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => applyTemplate(t)} className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-orange-500/50 transition">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{t.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{t.name}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{t.description}</div>
                  <div className="text-[10px] text-zinc-600 mt-1">{t.metrics.length} daily requirements</div>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
              </div>
            </button>
          ))}

          <button onClick={() => setStep('build')} className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-orange-500/50 transition">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚙️</span>
              <div className="flex-1">
                <div className="text-sm font-bold text-white">Custom</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Pick your own metrics and set your own rules.</div>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Builder (pre-filled from template or empty for custom)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setStep('pick')} className="text-zinc-500 text-xs">← Back</button>
        <button onClick={onDone} className="text-zinc-500 text-xs">Cancel</button>
      </div>

      <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Challenge name"
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-orange-500 outline-none" />

      <div>
        <label className="text-[11px] font-bold text-zinc-500 uppercase mb-2 block">Start Date</label>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 outline-none" />
        <span className="text-[10px] text-zinc-600 ml-2">Ends: {new Date(new Date(startDate).getTime() + 74 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>

      {groups.length > 0 && (
        <div>
          <label className="text-[11px] font-bold text-zinc-500 uppercase mb-2 block">Challenge Type</label>
          <div className="flex gap-2">
            <button onClick={() => setGroupId(null)} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${!groupId ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-zinc-700 text-zinc-400'}`}>Solo</button>
            {groups.map((g: any) => (
              <button key={g.id} onClick={() => setGroupId(g.id)} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${groupId === g.id ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-zinc-700 text-zinc-400'}`}>
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {groupId && (
        <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-3">
          <div>
            <div className="text-xs font-bold text-white">Shared Fate</div>
            <div className="text-[10px] text-zinc-500">If one person fails, everyone fails</div>
          </div>
          <button onClick={() => setSharedFailure(!sharedFailure)}
            className={`w-10 h-5 rounded-full transition-colors ${sharedFailure ? 'bg-orange-500' : 'bg-zinc-700'}`}>
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${sharedFailure ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      )}

      <div>
        <label className="text-[11px] font-bold text-zinc-500 uppercase mb-2 block">What to Track</label>
        <div className="grid grid-cols-2 gap-2">
          {APP_METRICS.map(m => {
            const selected = selectedMetrics.some(s => s.id === m.id);
            return (
              <button key={m.id} onClick={() => toggleMetric(m)}
                className={`p-3 rounded-lg border text-left transition ${selected ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'}`}>
                <div className="text-xs font-bold text-white">{m.label}</div>
                <div className="text-[10px] text-zinc-500">{m.unit}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom checkboxes */}
      <div>
        <label className="text-[11px] font-bold text-zinc-500 uppercase mb-2 block">Custom Daily Habits</label>
        <div className="flex gap-2">
          <input type="text" value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder="e.g. Read 30 min, No alcohol"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 outline-none"
            onKeyDown={e => { if (e.key === 'Enter') addCustom(); }} />
          <button onClick={addCustom} className="bg-zinc-800 border border-zinc-700 text-zinc-400 px-3 rounded-lg text-xs font-bold">Add</button>
        </div>
      </div>

      {/* Selected metrics with minimums */}
      {selectedMetrics.length > 0 && (
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-zinc-500 uppercase block">Minimums</label>
          {selectedMetrics.map(m => (
            <div key={m.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              <span className="text-xs text-white">{m.label}</span>
              {m.type === 'app' ? (
                <input type="number" value={m.minimum} onChange={e => updateMinimum(m.id, Number(e.target.value))}
                  className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white text-center focus:border-orange-500 outline-none" />
              ) : (
                <span className="text-[10px] text-zinc-500">Daily checkbox</span>
              )}
              <button onClick={() => setSelectedMetrics(prev => prev.filter(s => s.id !== m.id))} className="text-zinc-600 hover:text-red-400 ml-2"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      <button onClick={handleCreate} disabled={selectedMetrics.length === 0 || saving}
        className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 rounded-xl text-sm uppercase tracking-wider disabled:opacity-50">
        {saving ? 'Creating...' : 'Start Challenge'}
      </button>
    </div>
  );
}

function JoinChallenge({ challenge, userId, onDone, onSkip }: { challenge: any; userId: string; onDone: () => void; onSkip: () => void }) {
  // Pre-fill with creator's metrics
  const creatorMember = (challenge.challenge_75_members || []).find((m: any) => m.user_id !== userId);
  const creatorMetrics = (challenge.challenge_75_metrics || []).filter((m: any) => m.member_id === creatorMember?.id);
  const [selectedMetrics, setSelectedMetrics] = useState<{ id: string; label: string; type: string; minimum: number }[]>(
    creatorMetrics.map((m: any) => ({ id: m.metric_id, label: m.label, type: m.metric_type, minimum: m.minimum || 0 }))
  );
  const [customLabel, setCustomLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleMetric = (m: typeof APP_METRICS[0]) => {
    setSelectedMetrics(prev => prev.some(s => s.id === m.id)
      ? prev.filter(s => s.id !== m.id)
      : [...prev, { id: m.id, label: m.label, type: 'app', minimum: m.defaultMin }]);
  };

  const addCustom = () => {
    if (!customLabel.trim()) return;
    const id = `custom_${customLabel.trim().toLowerCase().replace(/\s+/g, '_')}`;
    setSelectedMetrics(prev => [...prev, { id, label: customLabel.trim(), type: 'custom', minimum: 0 }]);
    setCustomLabel('');
  };

  const updateMinimum = (id: string, val: number) => {
    setSelectedMetrics(prev => prev.map(m => m.id === id ? { ...m, minimum: val } : m));
  };

  const handleJoin = async () => {
    if (selectedMetrics.length === 0) return;
    setSaving(true);
    await fetch('/api/challenge-75', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', challenge_id: challenge.id, metrics: selectedMetrics }),
    });
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Join Challenge</h2>
        <button onClick={onSkip} className="text-zinc-500 text-xs">Skip</button>
      </div>

      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 text-center">
        <div className="text-sm font-bold text-white">{challenge.title}</div>
        <div className="text-[10px] text-zinc-500 mt-1">Created by a group member · {challenge.challenge_75_members?.length || 1} participant(s)</div>
      </div>

      <p className="text-sm text-zinc-400">Choose your daily requirements. You&apos;ll be evaluated against these targets each day.</p>

      <div>
        <label className="text-[11px] font-bold text-zinc-500 uppercase mb-2 block">What to Track</label>
        <div className="grid grid-cols-2 gap-2">
          {APP_METRICS.map(m => {
            const selected = selectedMetrics.some(s => s.id === m.id);
            return (
              <button key={m.id} onClick={() => toggleMetric(m)}
                className={`p-3 rounded-lg border text-left transition ${selected ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'}`}>
                <div className="text-xs font-bold text-white">{m.label}</div>
                <div className="text-[10px] text-zinc-500">{m.unit}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-bold text-zinc-500 uppercase mb-2 block">Custom Daily Habits</label>
        <div className="flex gap-2">
          <input type="text" value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder="e.g. Read 30 min, No alcohol"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 outline-none"
            onKeyDown={e => { if (e.key === 'Enter') addCustom(); }} />
          <button onClick={addCustom} className="bg-zinc-800 border border-zinc-700 text-zinc-400 px-3 rounded-lg text-xs font-bold">Add</button>
        </div>
      </div>

      {selectedMetrics.length > 0 && (
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-zinc-500 uppercase block">Your Minimums</label>
          {selectedMetrics.map(m => (
            <div key={m.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              <span className="text-xs text-white">{m.label}</span>
              {m.type === 'app' ? (
                <input type="number" value={m.minimum} onChange={e => updateMinimum(m.id, Number(e.target.value))}
                  className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white text-center focus:border-orange-500 outline-none" />
              ) : (
                <span className="text-[10px] text-zinc-500">Daily checkbox</span>
              )}
              <button onClick={() => setSelectedMetrics(prev => prev.filter(s => s.id !== m.id))} className="text-zinc-600 hover:text-red-400 ml-2"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      <button onClick={handleJoin} disabled={selectedMetrics.length === 0 || saving}
        className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 rounded-xl text-sm uppercase tracking-wider disabled:opacity-50">
        {saving ? 'Joining...' : 'Join Challenge'}
      </button>
    </div>
  );
}

function ChallengeView({ challenge, userId, onBack }: { challenge: Challenge; userId: string; onBack: () => void }) {
  const [days, setDays] = useState(challenge.challenge_75_days || []);
  const startDate = new Date(challenge.start_date);
  const myDays = days.filter((d: any) => d.user_id === userId);
  const passedCount = myDays.filter((d: any) => d.status === 'passed').length;
  const members = challenge.challenge_75_members || [];
  const myMembership = members.find((m: any) => m.user_id === userId);
  const allMetrics = challenge.challenge_75_metrics || [];
  // Show per-member metrics if available, fall back to shared (member_id null)
  const metrics = allMetrics.filter((m: any) => m.member_id === myMembership?.id) .length > 0
    ? allMetrics.filter((m: any) => m.member_id === myMembership?.id)
    : allMetrics.filter((m: any) => !m.member_id);
  const isGroup = !!challenge.group_id;

  const today = new Date().toLocaleDateString('en-CA');
  const todayRecord = myDays.find((d: any) => d.date === today);
  const customMetrics = metrics.filter((m: any) => m.metric_type === 'custom');

  const handleCheck = async (metricId: string, checked: boolean) => {
    await fetch('/api/challenge-75', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check_custom', challenge_id: challenge.id, metric_id: metricId, checked }),
    });
    // Optimistic update
    setDays(prev => {
      const existing = prev.find((d: any) => d.user_id === userId && d.date === today);
      if (existing) {
        return prev.map((d: any) => d === existing ? { ...d, custom_checks: { ...d.custom_checks, [metricId]: checked } } : d);
      }
      return [...prev, { user_id: userId, date: today, status: 'pending', custom_checks: { [metricId]: checked }, metrics_snapshot: {} }];
    });
  };

  const handleRestart = async () => {
    if (!confirm('Restart this challenge? All progress will be reset.')) return;
    await fetch('/api/challenge-75', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restart', challenge_id: challenge.id }),
    });
    onBack();
  };

  // Build 75-day calendar grid
  const calendarDays = Array.from({ length: 75 }, (_, i) => {
    const d = new Date(startDate.getTime() + i * 86400000);
    const dateStr = d.toLocaleDateString('en-CA');
    const record = myDays.find((r: any) => r.date === dateStr);
    const isFuture = d > new Date();
    const isToday = dateStr === today;
    return { day: i + 1, date: dateStr, status: record?.status || (isFuture ? 'future' : 'pending'), isToday };
  });

  const myStatus = myMembership?.status || challenge.status;
  const daysPassed = Math.floor((Date.now() - startDate.getTime()) / 86400000);
  const endDate = new Date(startDate.getTime() + 74 * 86400000);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-zinc-500 text-xs">← Back</button>
        {myStatus === 'failed' && (
          <button onClick={handleRestart} className="flex items-center gap-1 text-xs text-orange-400 font-bold"><RotateCcw size={12} /> Restart</button>
        )}
      </div>

      <div className="text-center">
        <h2 className="text-lg font-black text-white">{challenge.title}</h2>
        <div className="text-sm text-zinc-400 mt-1">
          {myStatus === 'joined' && <span>Day {Math.min(daysPassed + 1, 75)} of 75 · ✅ {passedCount} days</span>}
          {myStatus === 'completed' && <span className="text-emerald-400 font-bold">🏆 Completed!</span>}
          {myStatus === 'failed' && <span className="text-red-400">Failed on day {Math.floor((new Date(myMembership.failed_on!).getTime() - startDate.getTime()) / 86400000) + 1} — {myMembership.failed_metric}</span>}
        </div>
        <div className="text-[10px] text-zinc-600 mt-1">
          {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Today's Custom Checks */}
      {challenge.status === 'active' && customMetrics.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase">Today&apos;s Check-in</span>
          {customMetrics.map((m: any) => {
            const checked = todayRecord?.custom_checks?.[m.metric_id] === true;
            return (
              <button key={m.metric_id} onClick={() => handleCheck(m.metric_id, !checked)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition ${checked ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-800'}`}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${checked ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'}`}>
                  {checked && <Check size={12} className="text-black" />}
                </div>
                <span className="text-xs text-white">{m.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
        <div className="grid grid-cols-15 gap-0.5">
          {calendarDays.map(d => (
            <div key={d.day} title={`Day ${d.day}: ${d.date}`}
              className={`w-full aspect-square rounded-sm flex items-center justify-center text-[7px] font-bold ${
                d.status === 'passed' ? 'bg-emerald-500 text-black' :
                d.status === 'failed' ? 'bg-red-500 text-black' :
                d.isToday ? 'bg-orange-500/30 text-orange-400 border border-orange-500' :
                d.status === 'future' ? 'bg-zinc-800/30 text-zinc-700' :
                'bg-zinc-800 text-zinc-500'
              }`}>
              {d.day}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-2 text-[9px] text-zinc-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Passed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" /> Failed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-zinc-800" /> Pending</span>
        </div>
      </div>

      {/* Group Members Status */}
      {isGroup && members.length > 1 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase">Group Progress</span>
          {members.map((m: any) => {
            const memberDays = days.filter((d: any) => d.user_id === m.user_id);
            const memberPassed = memberDays.filter((d: any) => d.status === 'passed').length;
            const memberToday = memberDays.find((d: any) => d.date === today);
            const checkedIn = memberToday?.status === 'passed' || Object.values(memberToday?.custom_checks || {}).some(Boolean);
            return (
              <div key={m.user_id} className="flex items-center justify-between">
                <span className="text-xs text-zinc-300">{m.user_id === userId ? 'You' : m.user_id.slice(0, 8)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500">{memberPassed} days</span>
                  <span className={`text-[10px] font-bold ${checkedIn ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {checkedIn ? '✅' : '⏳'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Metrics being tracked */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-1.5">
        <span className="text-[10px] font-bold text-zinc-500 uppercase">Tracking</span>
        {metrics.map((m: any) => (
          <div key={m.id} className="flex items-center justify-between text-xs">
            <span className="text-zinc-300">{m.label}</span>
            <span className="text-zinc-500">{m.metric_type === 'custom' ? 'Daily ✓' : `≥ ${m.minimum}`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
