/**
 * Ingest txt workout programs into the DB as default templates.
 * 
 * Usage: npx tsx scripts/ingest-programs.ts
 * 
 * Prerequisites:
 *   1. Run in Supabase SQL editor:
 *      ALTER TABLE program_blocks ADD COLUMN IF NOT EXISTS exercises JSONB;
 *   2. SUPABASE_SERVICE_ROLE_KEY set in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TRAINING_PATH = process.argv[2] || 'hybrid';
const DIR_MAP: Record<string, string> = {
  hybrid: 'weekly',
  endurance: 'endurance',
  strength: 'strength',
  mobility: 'mobility',
};
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface BlockRow {
  workout_id: string;
  block_order: number;
  block_type: string;
  exercise_id?: string;
  target_sets?: number;
  target_reps?: number;
  duration_seconds?: number;
  incline?: number;
  intensity?: string;
  notes?: string;
  section?: string;
  rest_seconds?: number;
  target_duration_seconds?: number;
  is_superset?: boolean;
  superset_group?: number;
  exercises?: any[];
}

// Fetch catalog for exercise ID lookups
async function getCatalog() {
  const { data } = await supabase.from('catalog').select('id, name');
  const map = new Map<string, string>();
  for (const c of data || []) {
    map.set(c.name.toLowerCase().trim(), c.id);
  }
  return map;
}

function findExerciseId(name: string, catalog: Map<string, string>): string | null {
  const clean = name.replace(/^\d+\.\s*/, '').trim().toLowerCase();
  
  // Exact match
  if (catalog.has(clean)) return catalog.get(clean)!;
  
  // Common aliases
  const aliases: Record<string, string> = {
    'pull-ups': 'pull-up',
    'pull ups': 'pull-up',
    'chin ups': 'chin-up',
    'chin-ups': 'chin-up',
    'dips': 'dip',
    'bb bent over row': 'barbell row',
    'bb row': 'barbell row',
    'db shrugs': 'dumbbell shrug',
    'db shrug': 'dumbbell shrug',
    'ez bar curl': 'ez-bar curl',
    'skullcrushers': 'skullcrusher',
    'skullcrusher': 'skullcrusher',
    'incline back fly': 'incline dumbbell reverse fly',
    'single arm row': 'dumbbell single arm row',
    'seated row': 'cable seated row',
    'lateral raise': 'dumbbell lateral raise',
    'rear delt fly': 'dumbbell rear delt fly',
    'face pulls': 'cable face pull',
    'face pull': 'cable face pull',
    'hammer curl': 'dumbbell hammer curl',
    'tricep rope pushdown': 'cable tricep pushdown',
    'arnold press': 'dumbbell arnold press',
    'front plate raise': 'plate front raise',
    'high pull': 'barbell high pull',
    'floor press': 'barbell floor press',
    'incline dumbbell press': 'dumbbell incline bench press',
    'seated press': 'dumbbell seated overhead press',
    'dumbbell rdl': 'dumbbell romanian deadlift',
    'pec fly': 'dumbbell fly',
    'ab roller': 'ab wheel rollout',
    'russian twists': 'russian twist',
    'crunch': 'crunch',
    'plank': 'plank',
    'leg extension': 'leg extension',
    'lying leg curl': 'lying leg curl',
  };
  
  if (aliases[clean] && catalog.has(aliases[clean])) return catalog.get(aliases[clean])!;
  
  // Fuzzy: find best token overlap
  const tokens = new Set(clean.split(/\s+/));
  let bestId: string | null = null;
  let bestScore = 0;
  for (const [catName, catId] of catalog) {
    const catTokens = catName.split(/\s+/);
    let score = 0;
    for (const t of catTokens) {
      if (tokens.has(t)) score++;
    }
    if (score > bestScore && score >= 2) {
      bestScore = score;
      bestId = catId;
    }
  }
  return bestId;
}

function parseIntensity(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes('all out') || lower.includes(' ao')) return 'all_out';
  if (lower.includes('push')) return 'push';
  if (lower.includes('walk') || lower.includes('wr') || lower.includes('recovery')) return 'recovery';
  return 'base';
}

function parseSeconds(line: string): number {
  // "3 min" or "45 sec" or "90 sec" or "1:30"
  const colonMatch = line.match(/(\d+):(\d{2})/);
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  
  const minMatch = line.match(/([\d.]+)\s*min/i);
  if (minMatch) return Math.round(parseFloat(minMatch[1]) * 60);
  
  const secMatch = line.match(/(\d+)\s*sec/i);
  if (secMatch) return parseInt(secMatch[1]);
  
  // "30 sec AO" or "45 push" — number at start
  const numMatch = line.match(/^(?:\d+\.\s*)?(\d+)\s+(?:sec\s+)?(?:push|ao|all|base|walk|wr)/i);
  if (numMatch) return parseInt(numMatch[1]);
  
  return 60; // default
}

function parseIncline(line: string): number {
  const match = line.match(/(\d+)%/);
  return match ? parseInt(match[1]) : 0;
}

function parseTxtFile(content: string, catalog: Map<string, string>): { section: string; blocks: Omit<BlockRow, 'workout_id'>[] }[] {
  const sections: { section: string; blocks: Omit<BlockRow, 'workout_id'>[] }[] = [];
  
  // Split by section headers [ENGINE], [ARMOR], [STRENGTH], [TREADMILL], [CORE], [RECOVERY], [MOBILITY]
  const sectionRegex = /\[(ENGINE|ARMOR|STRENGTH|TREADMILL|CORE|RECOVERY|MOBILITY)\]/gi;
  const parts = content.split(sectionRegex);
  
  let blockOrder = 0;
  
  for (let i = 1; i < parts.length; i += 2) {
    const sectionType = parts[i].toUpperCase();
    const body = parts[i + 1] || '';
    const lines = body.split('\n').map(l => l.trim()).filter(l => l);
    
    if (sectionType === 'TREADMILL' || sectionType === 'ENGINE') {
      // Parse treadmill intervals
      for (const line of lines) {
        // Skip headers/goals/notes
        if (/^(Goal|Note|Transition|\d+\.\s*(The|Warm|Tread))/i.test(line)) continue;
        if (!line.match(/\d/)) continue; // needs a number
        
        const seconds = parseSeconds(line);
        const intensity = parseIntensity(line);
        const incline = parseIncline(line);
        
        sections.push({
          section: 'main',
          blocks: [{
            block_order: blockOrder++,
            block_type: 'treadmill',
            duration_seconds: seconds,
            intensity,
            incline: incline || undefined,
            section: 'main',
          }]
        });
      }
    } else if (sectionType === 'CORE') {
      // Parse core exercises
      for (const line of lines) {
        const supersetMatch = line.match(/Superset\s+\((.*?)\)/i);
        if (supersetMatch) {
          const names = supersetMatch[1].split(/\s*\+\s*/);
          sections.push({
            section: 'core',
            blocks: [{
              block_order: blockOrder++,
              block_type: 'superset',
              target_sets: 3,
              rest_seconds: 30,
              section: 'core',
              notes: line,
              exercises: names.map(n => ({
                name: n.trim(),
                exercise_id: findExerciseId(n.trim(), catalog),
                reps: '60s',
              })),
            }]
          });
          continue;
        }
        
        // Single exercise: "Plank: 1 Set" or "Ab Roller: 3 sets to failure"
        const exMatch = line.match(/[•◦-]?\s*(.*?):\s*(\d+)\s*[Ss]et/);
        if (exMatch) {
          const name = exMatch[1].replace(/^\d+\.\s*/, '').trim();
          const sets = parseInt(exMatch[2]);
          sections.push({
            section: 'core',
            blocks: [{
              block_order: blockOrder++,
              block_type: 'exercise',
              exercise_id: findExerciseId(name, catalog) || undefined,
              target_sets: sets,
              notes: name + (line.includes('failure') ? ' (to failure)' : line.includes('Max') ? ' (max hold)' : ''),
              section: 'core',
            }]
          });
        }
        
        // "Russian Twists (Weighted): 3 sets x 20 reps"
        const stdMatch = line.match(/[•◦-]?\s*(.*?):\s*(\d+)\s*sets?\s*x?\s*(\d+)?\s*reps?/i);
        if (stdMatch && !exMatch) {
          const name = stdMatch[1].replace(/^\d+\.\s*/, '').replace(/\(.*?\)/, '').trim();
          sections.push({
            section: 'core',
            blocks: [{
              block_order: blockOrder++,
              block_type: 'exercise',
              exercise_id: findExerciseId(name, catalog) || undefined,
              target_sets: parseInt(stdMatch[2]),
              target_reps: stdMatch[3] ? parseInt(stdMatch[3]) : undefined,
              notes: name,
              section: 'core',
            }]
          });
        }
      }
    } else if (sectionType === 'RECOVERY' || sectionType === 'MOBILITY') {
      // Store as a single info block
      const text = lines.filter(l => !l.match(/^\d+\.\s*(Active|Stretching)/)).join('\n');
      sections.push({
        section: sectionType === 'RECOVERY' ? 'warmup' : 'main',
        blocks: [{
          block_order: blockOrder++,
          block_type: 'exercise',
          notes: text,
          section: sectionType === 'RECOVERY' ? 'warmup' : 'main',
          target_sets: sectionType === 'MOBILITY' ? 2 : 1,
        }]
      });
    } else {
      // ARMOR / STRENGTH — parse exercises and supersets
      let supersetGroup = 0;
      
      for (let j = 0; j < lines.length; j++) {
        const line = lines[j];
        
        // Skip headers, warm-up cards, focus lines, notes
        if (/^(Focus|Card|Note|\d+\.\s*(The|Warm))/i.test(line)) continue;
        if (/^(Goal|Transition)/i.test(line)) continue;
        
        // Superset / Giant Set
        const supersetMatch = line.match(/(?:Superset|Giant Set|Tri-Set)\s+\((.*?)\)/i);
        if (supersetMatch) {
          const names = supersetMatch[1].split(/\s*\+\s*/);
          const setsMatch = line.match(/(\d+)\s*(?:Sets?|Rounds?)/i);
          const sets = setsMatch ? parseInt(setsMatch[1]) : 3;
          const restMatch = line.match(/Rest[:\s]+(\d+)\s*sec/i);
          const rest = restMatch ? parseInt(restMatch[1]) : 60;
          
          // Look ahead for reps info
          let repsInfo: string[] = [];
          for (let k = j + 1; k < Math.min(j + 4, lines.length); k++) {
            const repLine = lines[k];
            const repMatch = repLine.match(/Reps?[:\s]+(.*)/i);
            if (repMatch) {
              // Parse "10, 8, 6, 4 / 10" or "12 / 12" or "Failure / Failure"
              repsInfo = repMatch[1].split('/').map(r => r.trim());
              break;
            }
          }
          
          // Look ahead for tips
          let tip: string | undefined;
          for (let k = j + 1; k < Math.min(j + 5, lines.length); k++) {
            const tipMatch = lines[k].match(/Tip[:\s]+(.*)/i);
            if (tipMatch) { tip = tipMatch[1]; break; }
          }
          
          sections.push({
            section: 'main',
            blocks: [{
              block_order: blockOrder++,
              block_type: 'superset',
              target_sets: sets,
              rest_seconds: rest,
              section: 'main',
              is_superset: true,
              superset_group: supersetGroup++,
              notes: tip,
              exercises: names.map((n, idx) => ({
                name: n.trim(),
                exercise_id: findExerciseId(n.trim(), catalog),
                reps: repsInfo[idx] || '10',
              })),
            }]
          });
          continue;
        }
        
        // Standalone exercise: "Barbell Back Squat: 4 Sets x 8-10 reps"
        const stdMatch = line.match(/^(?:\d+\.\s*)?(.*?):\s*(\d+)\s*Sets?\s*x?\s*([\d\-]+)?\s*(?:reps?)?/i);
        if (stdMatch) {
          const name = stdMatch[1].trim();
          const sets = parseInt(stdMatch[2]);
          const repsStr = stdMatch[3] || '10';
          const reps = parseInt(repsStr); // takes first number from "8-10"
          const restMatch = line.match(/Rest[:\s]+(\d+)\s*sec/i);
          const rest = restMatch ? parseInt(restMatch[1]) : 60;
          
          let tip: string | undefined;
          for (let k = j + 1; k < Math.min(j + 3, lines.length); k++) {
            const tipMatch = lines[k].match(/Tip[:\s]+(.*)/i);
            if (tipMatch) { tip = tipMatch[1]; break; }
          }
          
          sections.push({
            section: 'main',
            blocks: [{
              block_order: blockOrder++,
              block_type: 'exercise',
              exercise_id: findExerciseId(name, catalog) || undefined,
              target_sets: sets,
              target_reps: reps,
              rest_seconds: rest,
              section: 'main',
              notes: tip,
            }]
          });
          continue;
        }
        
        // Finisher: "Finisher - Seated Row: 1 Set (2 mins)"
        const finisherMatch = line.match(/Finisher\s*[-–]\s*(.*?):\s*(\d+)\s*Set/i);
        if (finisherMatch) {
          const name = finisherMatch[1].trim();
          const durationMatch = line.match(/(\d+)\s*min/i);
          sections.push({
            section: 'main',
            blocks: [{
              block_order: blockOrder++,
              block_type: 'exercise',
              exercise_id: findExerciseId(name, catalog) || undefined,
              target_sets: parseInt(finisherMatch[2]),
              target_duration_seconds: durationMatch ? parseInt(durationMatch[1]) * 60 : undefined,
              section: 'main',
              notes: 'Max reps' + (durationMatch ? ` in ${durationMatch[1]} min` : ''),
            }]
          });
        }
      }
    }
  }
  
  return sections;
}

async function main() {
  const catalog = await getCatalog();
  const subDir = DIR_MAP[TRAINING_PATH] || TRAINING_PATH;
  console.log(`Ingesting path: ${TRAINING_PATH} (from ${subDir}/)`);
  console.log(`Loaded ${catalog.size} catalog exercises`);
  
  // Clear existing defaults for this path
  const { data: existing } = await supabase
    .from('workout_programs')
    .select('id')
    .eq('is_default', true)
    .eq('training_path', TRAINING_PATH);
  
  if (existing?.length) {
    console.log(`Deleting ${existing.length} existing default programs...`);
    await supabase
      .from('workout_programs')
      .delete()
      .eq('is_default', true)
      .eq('training_path', TRAINING_PATH);
  }
  
  const workoutsDir = path.join(process.cwd(), 'public', 'workouts', subDir);
  
  for (const day of DAYS) {
    const filePath = path.join(workoutsDir, `${day}.txt`);
    if (!fs.existsSync(filePath)) {
      console.log(`⏭ ${day}: no file`);
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = parseTxtFile(content, catalog);
    
    // Create the program
    const { data: program, error: progErr } = await supabase
      .from('workout_programs')
      .insert({
        user_id: null,
        name: `${day} - Hybrid`,
        is_default: true,
        training_path: TRAINING_PATH,
        day_of_week: day,
      })
      .select('id')
      .single();
    
    if (progErr || !program) {
      console.error(`✗ ${day}: failed to create program`, progErr?.message);
      continue;
    }
    
    // Flatten all blocks and insert
    const allBlocks: BlockRow[] = [];
    for (const section of parsed) {
      for (const block of section.blocks) {
        allBlocks.push({
          ...block,
          workout_id: program.id,
        });
      }
    }
    
    if (allBlocks.length > 0) {
      const { error: blockErr } = await supabase
        .from('program_blocks')
        .insert(allBlocks);
      
      if (blockErr) {
        console.error(`✗ ${day}: failed to insert blocks`, blockErr.message);
      } else {
        console.log(`✓ ${day}: ${allBlocks.length} blocks (program ${program.id})`);
      }
    } else {
      console.log(`⚠ ${day}: no blocks parsed`);
    }
  }
  
  console.log('\nDone! Default programs ingested for path:', TRAINING_PATH);
}

main().catch(console.error);
