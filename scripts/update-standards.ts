import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { STRENGTH_STANDARDS } from './standards-data/strength-1';
import { STRENGTH_STANDARDS_2 } from './standards-data/strength-2';
import { ENDURANCE_STANDARDS } from './standards-data/endurance';
import { MOBILITY_STANDARDS } from './standards-data/mobility';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Path → key exercise IDs (12 per path)
const PATH_KEY_EXERCISES: Record<string, string[]> = {
  strength: [
    'bench_press', 'back_squat', 'deadlift', 'overhead_press', 'barbell_row',
    'pull_up', 'dip', 'rdl', 'incline_bench', 'bulgarian_split_squat',
    'barbell_bicep_curl', 'plank',
  ],
  endurance: [
    'run_1_mile', 'run_400m', 'row_6min', 'dead_hang', 'plank',
    'burpees', 'back_squat', 'deadlift', 'push_ups', 'pull_up',
    'bulgarian_split_squat', 'calf_raises',
  ],
  mobility: [
    'deep_squat_hold', 'active_hang', 'overhead_squat_hold', 'cossack_squat',
    'wall_slide', 'shoulder_dislocate', 'plank', 'push_ups',
    'body_weight_squat', 'pull_up', 'goblet_squat', 'rdl',
  ],
  hybrid: [
    'bench_press', 'back_squat', 'deadlift', 'pull_up', 'run_1_mile',
    'plank', 'overhead_press', 'run_400m', 'deep_squat_hold',
    'barbell_row', 'push_ups', 'dead_hang',
  ],
};

// Collect all standards (dedup by exercise_id — first occurrence wins)
const allStandards = [
  ...STRENGTH_STANDARDS,
  ...STRENGTH_STANDARDS_2,
  ...ENDURANCE_STANDARDS,
  ...MOBILITY_STANDARDS,
];
const seen = new Set<string>();
const uniqueStandards = allStandards.filter(s => {
  if (seen.has(s.exercise_id)) return false;
  seen.add(s.exercise_id);
  return true;
});

async function updateStandards() {
  console.log('📊 Updating exercise standards with new age brackets...\n');

  for (const entry of uniqueStandards) {
    const { error } = await supabase
      .from('catalog')
      .update({ standards: entry.standards })
      .eq('id', entry.exercise_id);

    if (error) {
      console.error(`  ❌ ${entry.exercise_id}: ${error.message}`);
    } else {
      console.log(`  ✅ ${entry.exercise_id}`);
    }
  }

  console.log(`\n📋 Storing path → key exercise mappings...`);

  // Store path mappings as a simple JSON in a known location
  // We'll use the users table or a config approach — for now, export as a constant
  // that the app can import. The Power Level calculation will filter by these.
  console.log('\nPath key exercises:');
  for (const [pathName, exercises] of Object.entries(PATH_KEY_EXERCISES)) {
    console.log(`  ${pathName}: ${exercises.length} exercises`);
  }

  console.log(`\n🎉 Done! Updated ${uniqueStandards.length} exercises with 5 age brackets.`);
}

updateStandards();

// Export for use by the app
export { PATH_KEY_EXERCISES };
