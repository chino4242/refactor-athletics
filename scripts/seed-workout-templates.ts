import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const templates = [
  { name: 'Kettlebell Complex', description: 'One bell. Rest when you need to, the clock doesnt stop.', format: 'amrap', duration_seconds: 900, exercises: [{"name":"Deadlifts","reps":5},{"name":"Rows","reps":5},{"name":"Swings","reps":5},{"name":"Goblet Squats","reps":5},{"name":"Cleans","reps":5}], equipment: ["kettlebell"], difficulty: 3, tags: ["kettlebell","full_body"], benchmark_score: '10 rounds' },
  { name: 'Kettlebell Burner', description: '4 rounds of heavy KB work.', format: 'for_time', duration_seconds: 1800, time_cap_seconds: 1800, rounds: 4, exercises: [{"name":"KB Swings","reps":20},{"name":"Goblet Squats","reps":20},{"name":"Farmers Carry","reps":1,"distance":"100m"},{"name":"KB Reverse Lunges","reps":30,"note":"15R/15L"},{"name":"Row","reps":1,"distance":"400m"}], equipment: ["kettlebell","rower"], difficulty: 4, tags: ["kettlebell","full_body","conditioning"] },
  { name: 'Lunge Press Circuit', description: 'Single KB flow. 2-3 min rest between rounds.', format: 'timed_rounds', duration_seconds: 1200, rounds: 5, exercises: [{"name":"Squat Pullover","reps":10},{"name":"Lunge Press","reps":8,"per_side":true},{"name":"Deadlift Row","reps":8,"per_side":true},{"name":"Curl Halo","reps":5,"per_side":true},{"name":"Push-Up Side Plank","reps":10,"per_side":true}], equipment: ["kettlebell"], difficulty: 3, tags: ["kettlebell","upper_body","core"] },
  { name: 'Hyrox Prep', description: 'Run/station pairs. Simulate race conditions.', format: 'for_time', duration_seconds: 2400, rounds: 2, exercises: [{"name":"Run","distance":"400m","segment":"run"},{"name":"Wall Balls","reps":25,"weight":"14 lb","segment":"station"},{"name":"Run","distance":"400m","segment":"run"},{"name":"Reverse Lunges","reps":25,"weight":"44 lb","segment":"station"},{"name":"Run","distance":"400m","segment":"run"},{"name":"KB Deadlift","reps":25,"weight":"53 lb","segment":"station"},{"name":"Run","distance":"400m","segment":"run"},{"name":"DB Squat","reps":25,"segment":"station"}], equipment: ["kettlebell","dumbbell","wall_ball"], difficulty: 5, tags: ["hyrox","running","conditioning"] },
  { name: 'Rev Lunge Complex', description: 'Lower body focus. 2-3 min rest between rounds.', format: 'timed_rounds', duration_seconds: 1200, rounds: 5, exercises: [{"name":"Reverse Lunges","reps":10,"per_side":true},{"name":"Row to Deadlift","reps":10,"per_side":true},{"name":"Thrusters","reps":8,"per_side":true},{"name":"Marches","reps":30,"unit":"sec","per_side":true}], equipment: ["kettlebell"], difficulty: 3, tags: ["kettlebell","lower_body"] },
  { name: 'Bodyweight Blitz', description: 'No equipment needed. Pure grit.', format: 'amrap', duration_seconds: 720, exercises: [{"name":"Push-Ups","reps":10},{"name":"Air Squats","reps":15},{"name":"Burpees","reps":5},{"name":"Sit-Ups","reps":10}], equipment: ["bodyweight"], difficulty: 2, tags: ["bodyweight","full_body","no_equipment"], benchmark_score: '8 rounds' },
  { name: 'Pull-Up Push-Up EMOM', description: 'Every minute on the minute. Alternating movements.', format: 'emom', duration_seconds: 600, exercises: {"minutes":10,"alternating":true,"odd_exercises":[{"name":"Pull-Ups","reps":5}],"even_exercises":[{"name":"Push-Ups","reps":12}]}, equipment: ["bodyweight","pull_up_bar"], difficulty: 3, tags: ["bodyweight","emom","upper_body"] },
  { name: 'Mobility Flow EMOM', description: 'Build stability and control.', format: 'emom', duration_seconds: 720, exercises: {"minutes":12,"alternating":false,"exercises":[{"name":"Cossack Squats","reps":5,"per_side":true},{"name":"Deep Squat Hold","reps":1,"unit":"30 sec"},{"name":"Pistol Squats","reps":3,"per_side":true}]}, equipment: ["bodyweight"], difficulty: 3, tags: ["bodyweight","mobility","emom","no_equipment"] },
  { name: 'KB Swing EMOM', description: '15 swings at the top of every minute. Rest whats left.', format: 'emom', duration_seconds: 600, exercises: {"minutes":10,"alternating":false,"exercises":[{"name":"KB Swings","reps":15}]}, equipment: ["kettlebell"], difficulty: 2, tags: ["kettlebell","emom","conditioning"] },
  { name: 'Calisthenics AMRAP', description: 'Gymnastics-inspired bodyweight work.', format: 'amrap', duration_seconds: 1200, exercises: [{"name":"Pull-Ups","reps":5},{"name":"Dips","reps":10},{"name":"Pistol Squats","reps":6,"per_side":true},{"name":"L-Sit Hold","reps":1,"unit":"15 sec"},{"name":"Handstand Hold","reps":1,"unit":"20 sec"}], equipment: ["bodyweight","pull_up_bar","dip_bars"], difficulty: 4, tags: ["bodyweight","calisthenics","gymnastics"], benchmark_score: '6 rounds' },
];

async function seed() {
  const { data, error } = await supabase.from('workout_templates').insert(templates);
  if (error) {
    console.error('Seed failed:', error);
  } else {
    console.log(`Seeded ${templates.length} workout templates`);
  }
}

seed();
