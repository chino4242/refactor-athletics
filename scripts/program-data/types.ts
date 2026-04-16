// Default workout program templates
// Each program is a 7-day week with exercises, treadmill blocks, and alternatives

export interface ProgramBlock {
  block_order: number;
  block_type: 'exercise' | 'treadmill';
  section: 'warmup' | 'main' | 'core' | 'cooldown';
  // Exercise fields
  exercise_id?: string;
  target_sets?: number;
  target_reps?: number;
  target_weight?: number;
  rest_seconds?: number;
  // Treadmill fields
  duration_seconds?: number;
  incline?: number;
  intensity?: string;
  // Alternatives
  alt_exercise_id?: string;
  alt_equipment?: string[];
  outdoor_alternative?: string;
  // Duration-based exercises
  target_duration_seconds?: number;
  notes?: string;
}

export interface ProgramDay {
  name: string;
  description: string;
  day_of_week: string;
  blocks: ProgramBlock[];
}

export interface DefaultProgram {
  training_path: string;
  days: ProgramDay[];
}
