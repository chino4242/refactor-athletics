export interface UserProfileData {
    user_id: string;
    age: number;
    sex: string;
    bodyweight: number;
    goal_weight?: number;
    is_onboarded?: boolean;
    selected_theme?: string;
    selected_path?: string;
    experience_mode?: 'rpg' | 'classic';
    waiver_accepted_at?: string;
    timezone?: string;
    display_name?: string;
    nutrition_targets?: NutritionTargets;
    hidden_habits?: string[];
    habit_targets?: Record<string, number>;
    body_composition_goals?: Record<string, string>;
    available_equipment?: string[];
    measurement_mode?: 'tape' | 'scale';
    sync_token?: string;
}

export interface NutritionTargets {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water?: number;
    calories_burned?: number;
    net_calorie_target?: number;
}

export interface WorkoutSet {
    weight: number;
    reps: number;
    distance: number;
    duration: number;
}

export interface HistoryItem {
    id?: number;
    exercise_id: string;
    date: string;
    level: number;
    timestamp: number;
    value: string;
    rank_name: string;
    xp?: number;
    description?: string;
    raw_value?: number;
    data?: WorkoutSet[];
}

export interface UserStats {
    power_level: number;
    max_expertise: number;
    exercises_tracked: number;
    highest_level_achieved: number;
    total_career_xp: number;
}

// Workout Types
export interface Workout {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

export interface WorkoutBlock {
    id: string;
    workout_id: string;
    block_order: number;
    block_type: 'exercise' | 'treadmill';

    // Exercise fields
    exercise_id?: string;
    target_sets?: number;
    target_reps?: number;
    target_weight?: number;
    is_superset?: boolean;
    superset_group?: number;

    // Treadmill fields
    duration_seconds?: number;
    incline?: number;
    intensity?: 'zone2' | 'base' | 'push' | 'all_out';

    notes?: string;
    created_at: string;
}

export interface WorkoutSchedule {
    id: string;
    user_id: string;
    workout_id: string;
    scheduled_date: string;
    completed: boolean;
    completed_at?: string;
    created_at: string;
}

export interface UserStats {
    power_level: number;
    max_expertise: number;
    exercises_tracked: number;
    highest_level_achieved: number;
    total_career_xp: number;
    player_level: number;
    level_progress_percent: number;
    xp_to_next_level: number;
    highest_daily_xp?: number;
    highest_weekly_xp?: number;
    no_alcohol_streak?: number;
    no_vice_streak?: number;
    habit_no_alcohol_tracked_today?: boolean;
    habit_no_vice_tracked_today?: boolean;
    total_volume_today?: number;
}

export interface ChallengeGoal {
    habit_id: string;
    target_value: number;
    tolerance: number;
    unit: string;
    label: string;
    comparison?: 'min' | 'max' | 'range';
}

export interface Challenge {
    id: string;
    user_id: string;
    name: string;
    duration_days: number;
    start_date: string;
    goals: ChallengeGoal[];
    status: 'alive' | 'reset' | 'completed' | 'failed';
    current_streak: number;
    last_checked: string | null;
    history: Record<string, boolean>;
}

export interface CatalogItem {
    id: string;
    name: string;
    category?: string;
    type?: string;
    description?: string;
    unit?: string;
    xp_factor?: number;
    normalization_factor?: number;
    normalizes_to?: string;
    required_equipment?: string[];
    swap_group?: string;
    standards?: {
        unit?: string;
        scoring?: string;
        brackets?: any;
    };
}

export interface DuelResponse {
    id: string;
    challenger_id: string;
    opponent_id: string | null;
    status: 'OPEN' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    start_at: number;
    end_at: number;
    challenger_xp?: number;
    opponent_xp?: number;
    winner_id?: string | null;
    // Legacy UI fields
    challenger_name?: string;
    opponent_name?: string;
    challenger_score?: number;
    opponent_score?: number;
    challenger_metric_total?: number;
    opponent_metric_total?: number;
    challenger_level?: number;
    opponent_level?: number;
    challenger_history?: any[];
    opponent_history?: any[];
    included_metrics?: string[];
}

export interface MilestoneResponse {
    id: string;
    exercise_id: string;
    category?: string;
    displayName: string;
    unit: string;
    current_level: number;
    current_value: number;
    next_milestone: number | null;
}

// Group / Party Types
export interface Group {
    id: string;
    name: string;
    leader_id: string;
    invite_code: string;
    created_at: string;
}

export interface GroupMember {
    group_id: string;
    user_id: string;
    joined_at: string;
    display_name?: string;
}

export interface GroupChallenge {
    id: string;
    group_id: string;
    metric: string;
    target: number;
    name?: string;
    week_start: string;
    start_date: string;
    end_date: string;
    created_by?: string;
    completed: boolean;
    completed_at?: string;
    mvp_user_id?: string;
    results?: Record<string, number>;
    created_at: string;
}

export interface UserBadge {
    id: string;
    user_id: string;
    badge_type: string;
    challenge_id?: string;
    metadata?: Record<string, any>;
    earned_at: string;
}

export type ChallengeMetric = 'steps' | 'active_minutes' | 'workouts' | 'water_days';

export const CHALLENGE_PRESETS: Record<ChallengeMetric, { label: string; emoji: string; unit: string; defaultTarget: number }> = {
    steps: { label: 'Total Steps', emoji: '🚶', unit: 'steps', defaultTarget: 100000 },
    active_minutes: { label: 'Active Minutes', emoji: '⏱️', unit: 'min', defaultTarget: 600 },
    workouts: { label: 'Workouts Completed', emoji: '🏋️', unit: 'workouts', defaultTarget: 20 },
    water_days: { label: 'Hydration Days', emoji: '💧', unit: 'days', defaultTarget: 35 },
};

export const BADGE_TYPES = {
    GROUP_CHALLENGE_MVP: 'group_challenge_mvp',
} as const;
