// Exercise form cues and video URLs
// These supplement the catalog table. When cue/video_url columns are added to catalog,
// this file can be removed and data migrated to DB.

export const EXERCISE_CUES: Record<string, { cue: string; video_url?: string }> = {
  // Compounds
  bench_press: { cue: "Retract shoulder blades, feet flat, drive bar up and slightly back. Touch mid-chest." },
  barbell_back_squat: { cue: "Bar on upper traps, break at hips and knees together, drive knees out, chest up." },
  deadlift: { cue: "Hinge at hips, bar close to shins, squeeze lats, drive floor away with legs." },
  barbell_overhead_press: { cue: "Brace core, press straight up, move head through once bar passes forehead." },
  barbell_incline_bench_press: { cue: "30° bench angle, same setup as flat bench, press toward ceiling." },
  barbell_row: { cue: "Hinge to 45°, pull bar to lower chest, squeeze shoulder blades at top." },

  // Dumbbell
  dumbbell_incline_bench_press: { cue: "30° incline, palms forward, press up and slightly in. Control the descent." },
  dumbbell_standing_shoulder_press: { cue: "Start at shoulders, press straight up, don't arch lower back." },
  dumbbell_lateral_raise: { cue: "Slight bend in elbows, raise to shoulder height, lead with pinkies." },
  dumbbell_rear_delt_fly: { cue: "Hinge forward 45°, arms slightly bent, squeeze shoulder blades apart." },
  dumbbell_rdl: { cue: "Soft knees, hinge at hips, dumbbells slide down thighs, feel hamstring stretch." },
  dumbbell_high_pull: { cue: "Start at hips, explosive pull to chin height, elbows high and wide." },

  // Smith
  smith_bench_press: { cue: "Same as bench press — retract scapula, touch mid-chest, drive up." },

  // Bodyweight
  pull_ups: { cue: "Dead hang start, pull elbows to hips, chin over bar, control the negative." },
  chin_ups: { cue: "Supinated grip, pull chest to bar, squeeze biceps at top." },
  dips: { cue: "Lean slightly forward for chest, upright for triceps. Go to 90° elbow bend." },
  push_ups: { cue: "Hands under shoulders, body straight, chest to floor, push through palms." },
  burpees: { cue: "Squat down, kick back, chest to floor, jump up explosively." },

  // Isolation
  tricep_pushdowns: { cue: "Elbows pinned to sides, extend fully, squeeze triceps at bottom." },
  barbell_skullcrusher: { cue: "Lower bar to forehead, elbows stay pointed at ceiling, extend to lockout." },
  barbell_bicep_curl: { cue: "Elbows at sides, curl with control, squeeze at top, slow negative." },
  cable_seated_row: { cue: "Sit tall, pull to lower chest, squeeze shoulder blades, control return." },
  lat_pulldown: { cue: "Lean back slightly, pull bar to upper chest, drive elbows down and back." },

  // Mobility / Kettlebell
  turkish_get_up: { cue: "Keep arm locked out overhead throughout. Roll to elbow, post hand, sweep leg, stand.", video_url: "https://www.youtube.com/watch?v=0bWRPC49-KI" },
  kettlebell_halo: { cue: "Hold KB upside down at chest, circle around head keeping core tight.", video_url: "https://www.youtube.com/watch?v=MxhCmfMnKKo" },
  kettlebell_windmill: { cue: "KB overhead, push hip out to side, slide free hand down inner leg, eyes on KB.", video_url: "https://www.youtube.com/watch?v=iRFMmqEOCQc" },
  kettlebell_swing: { cue: "Hinge at hips, snap hips forward, arms are just along for the ride. Power from glutes.", video_url: "https://www.youtube.com/watch?v=YSxHifyI6s8" },
  cossack_squat: { cue: "Wide stance, shift weight to one side, sit deep, straight leg stays extended.", video_url: "https://www.youtube.com/watch?v=tpczTeSkHz0" },
  goblet_squat: { cue: "Hold weight at chest, squat deep between knees, elbows push knees out." },
  deep_squat_hold: { cue: "Feet shoulder width, sink as deep as possible, hold with upright torso." },
  hip_90_90: { cue: "Both legs at 90°, rotate from one side to the other, keep spine tall.", video_url: "https://www.youtube.com/watch?v=bFiGOzNPnBM" },
  shoulder_dislocate: { cue: "Wide grip on PVC/band, keep arms straight, rotate overhead and behind back." },
  dead_hang: { cue: "Full grip on bar, relax shoulders, let spine decompress. Breathe." },
  cat_cow: { cue: "On all fours, alternate arching (cow) and rounding (cat) the spine." },
  thread_the_needle: { cue: "On all fours, reach one arm under body and rotate, feel thoracic stretch." },
  couch_stretch: { cue: "Back knee against wall, front foot forward, squeeze glute to feel hip flexor stretch.", video_url: "https://www.youtube.com/watch?v=UGEpQ1BRx-4" },
  overhead_squat_hold: { cue: "Arms locked overhead with PVC/bar, squat deep maintaining upright torso." },

  // Core
  plank: { cue: "Forearms on floor, body straight from head to heels, squeeze glutes and brace abs." },
  ab_crunch: { cue: "Hands behind head, curl shoulders off floor, exhale at top." },
  hanging_leg_raises: { cue: "Dead hang, raise legs to 90° with control, don't swing." },
  russian_twists: { cue: "Lean back 45°, feet off floor, rotate side to side touching floor." },
  v_up: { cue: "Lie flat, simultaneously raise legs and torso to touch toes at top." },

  // Legs
  bulgarian_split_squat: { cue: "Rear foot on bench, drop back knee straight down, front knee tracks over toes." },
};
