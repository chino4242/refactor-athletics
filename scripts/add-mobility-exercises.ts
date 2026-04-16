import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 6 testable mobility exercises with progressive standards
// Standards use the same bracket format as existing catalog exercises
// Levels 1-5 represent beginner → elite mobility
const MOBILITY_EXERCISES = [
  {
    id: 'deep_squat_hold',
    name: 'Deep Squat Hold',
    type: 'duration',
    category: 'Mobility',
    xp_factor: 1.0,
    required_equipment: ['bodyweight_only'],
    standards: {
      unit: 'Sec',
      scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 0, max: 39, levels: [15, 30, 60, 90, 120] },
          { min: 40, max: 59, levels: [10, 25, 45, 75, 100] },
          { min: 60, max: 100, levels: [10, 20, 40, 60, 90] },
        ],
        female: [
          { min: 0, max: 39, levels: [15, 30, 60, 90, 120] },
          { min: 40, max: 59, levels: [10, 25, 45, 75, 100] },
          { min: 60, max: 100, levels: [10, 20, 40, 60, 90] },
        ],
      },
    },
  },
  {
    id: 'active_hang',
    name: 'Active Hang',
    type: 'duration',
    category: 'Mobility',
    xp_factor: 1.0,
    required_equipment: ['pull_up_bar'],
    standards: {
      unit: 'Sec',
      scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 0, max: 39, levels: [15, 30, 45, 60, 90] },
          { min: 40, max: 59, levels: [10, 20, 35, 50, 75] },
          { min: 60, max: 100, levels: [10, 15, 30, 45, 60] },
        ],
        female: [
          { min: 0, max: 39, levels: [10, 20, 35, 50, 75] },
          { min: 40, max: 59, levels: [8, 15, 25, 40, 60] },
          { min: 60, max: 100, levels: [5, 10, 20, 35, 50] },
        ],
      },
    },
  },
  {
    id: 'wall_slide',
    name: 'Wall Slide',
    type: 'reps_only',
    category: 'Mobility',
    xp_factor: 1.0,
    required_equipment: ['bodyweight_only'],
    standards: {
      unit: 'Reps',
      scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 0, max: 39, levels: [5, 10, 15, 20, 30] },
          { min: 40, max: 59, levels: [5, 8, 12, 18, 25] },
          { min: 60, max: 100, levels: [3, 6, 10, 15, 20] },
        ],
        female: [
          { min: 0, max: 39, levels: [5, 10, 15, 20, 30] },
          { min: 40, max: 59, levels: [5, 8, 12, 18, 25] },
          { min: 60, max: 100, levels: [3, 6, 10, 15, 20] },
        ],
      },
    },
  },
  {
    id: 'overhead_squat_hold',
    name: 'Overhead Squat Hold',
    type: 'duration',
    category: 'Mobility',
    xp_factor: 1.2,
    required_equipment: ['bodyweight_only'],
    standards: {
      unit: 'Sec',
      scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 0, max: 39, levels: [10, 20, 30, 45, 60] },
          { min: 40, max: 59, levels: [8, 15, 25, 35, 50] },
          { min: 60, max: 100, levels: [5, 10, 20, 30, 45] },
        ],
        female: [
          { min: 0, max: 39, levels: [10, 20, 30, 45, 60] },
          { min: 40, max: 59, levels: [8, 15, 25, 35, 50] },
          { min: 60, max: 100, levels: [5, 10, 20, 30, 45] },
        ],
      },
    },
  },
  {
    id: 'shoulder_dislocate',
    name: 'Shoulder Dislocate (PVC/Band)',
    type: 'reps_only',
    category: 'Mobility',
    xp_factor: 1.0,
    required_equipment: ['bodyweight_only'],
    standards: {
      unit: 'Reps',
      scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 0, max: 39, levels: [5, 10, 15, 20, 30] },
          { min: 40, max: 59, levels: [3, 8, 12, 18, 25] },
          { min: 60, max: 100, levels: [3, 5, 10, 15, 20] },
        ],
        female: [
          { min: 0, max: 39, levels: [5, 10, 15, 20, 30] },
          { min: 40, max: 59, levels: [3, 8, 12, 18, 25] },
          { min: 60, max: 100, levels: [3, 5, 10, 15, 20] },
        ],
      },
    },
  },
  {
    id: 'cossack_squat',
    name: 'Cossack Squat',
    type: 'reps_only',
    category: 'Mobility',
    xp_factor: 1.2,
    required_equipment: ['bodyweight_only'],
    standards: {
      unit: 'Reps',
      scoring: 'higher_is_better',
      brackets: {
        male: [
          { min: 0, max: 39, levels: [3, 6, 10, 15, 20] },
          { min: 40, max: 59, levels: [2, 5, 8, 12, 18] },
          { min: 60, max: 100, levels: [2, 4, 6, 10, 15] },
        ],
        female: [
          { min: 0, max: 39, levels: [3, 6, 10, 15, 20] },
          { min: 40, max: 59, levels: [2, 5, 8, 12, 18] },
          { min: 60, max: 100, levels: [2, 4, 6, 10, 15] },
        ],
      },
    },
  },
];

async function addMobilityExercises() {
  console.log('🧘 Adding mobility exercises to catalog...');

  for (const ex of MOBILITY_EXERCISES) {
    const { error } = await supabase.from('catalog').upsert(ex, { onConflict: 'id' });
    if (error) {
      console.error(`❌ Failed: ${ex.id}`, error.message);
    } else {
      console.log(`✅ ${ex.name}`);
    }
  }

  console.log('\n🎉 Done! Added 6 mobility exercises with standards.');
}

addMobilityExercises();
