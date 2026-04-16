import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { HYBRID_PROGRAM, STRENGTH_PROGRAM, ENDURANCE_PROGRAM, MOBILITY_PROGRAM } from './program-data';
import type { DefaultProgram } from './program-data';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ALL_PROGRAMS: DefaultProgram[] = [HYBRID_PROGRAM, STRENGTH_PROGRAM, ENDURANCE_PROGRAM, MOBILITY_PROGRAM];

async function seedPrograms() {
  console.log('🏋️ Seeding default workout programs...\n');

  // Clear existing defaults
  const { error: delErr } = await supabase
    .from('workout_programs')
    .delete()
    .eq('is_default', true);
  if (delErr) console.log('⚠️  Could not clear old defaults:', delErr.message);

  for (const program of ALL_PROGRAMS) {
    console.log(`\n📋 ${program.training_path.toUpperCase()}`);

    for (const day of program.days) {
      // Insert program day
      const { data: prog, error: progErr } = await supabase
        .from('workout_programs')
        .insert({
          user_id: null,
          name: day.name,
          description: day.description,
          is_default: true,
          training_path: program.training_path,
          day_of_week: day.day_of_week,
        })
        .select('id')
        .single();

      if (progErr || !prog) {
        console.error(`  ❌ ${day.day_of_week} — ${day.name}:`, progErr?.message);
        continue;
      }

      // Insert blocks
      if (day.blocks.length > 0) {
        const blocks = day.blocks.map(b => ({
          workout_id: prog.id,
          block_order: b.block_order,
          block_type: b.block_type,
          exercise_id: b.exercise_id || null,
          target_sets: b.target_sets || null,
          target_reps: b.target_reps || null,
          target_weight: b.target_weight || null,
          duration_seconds: b.duration_seconds || null,
          incline: b.incline ?? null,
          intensity: b.intensity || null,
          notes: b.notes || null,
          alt_exercise_id: b.alt_exercise_id || null,
          alt_equipment: b.alt_equipment || null,
          outdoor_alternative: b.outdoor_alternative || null,
          section: b.section || null,
          target_duration_seconds: b.target_duration_seconds || null,
          rest_seconds: b.rest_seconds ?? 90,
        }));

        const { error: blockErr } = await supabase.from('program_blocks').insert(blocks);
        if (blockErr) {
          console.error(`  ❌ blocks for ${day.day_of_week}:`, blockErr.message);
        } else {
          console.log(`  ✅ ${day.day_of_week} — ${day.name} (${blocks.length} blocks)`);
        }
      } else {
        console.log(`  ✅ ${day.day_of_week} — ${day.name} (rest day)`);
      }
    }
  }

  // Verify
  const { count } = await supabase
    .from('workout_programs')
    .select('*', { count: 'exact', head: true })
    .eq('is_default', true);

  console.log(`\n🎉 Done! ${count} default program days seeded.`);
}

seedPrograms();
