/**
 * Generate exercise form demo videos using Veo 3.1 via @google/genai SDK.
 * 
 * Usage:
 *   GEMINI_API_KEY=$(grep GEMINI_API_KEY .env.local | cut -d= -f2) npx tsx scripts/generate-exercise-demos.ts kettlebell_complex
 */

import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OUTPUT_DIR = path.join(process.cwd(), 'public/exercises/demos');
const AVATAR_PATH = path.join(process.cwd(), 'public/avatars/samurai/male_t1.png');

const WORKOUTS: Record<string, { exercise: string; prompt: string }[]> = {
  kettlebell_complex: [
    { exercise: 'kettlebell_deadlift', prompt: 'Animate the character in this uploaded image performing a flawless kettlebell deadlift, maintaining the exact illustrated art style. Side angle view, smooth motion, dark simple background.' },
    { exercise: 'kettlebell_row', prompt: 'Animate the character in this uploaded image performing a flawless single-arm kettlebell row, maintaining the exact illustrated art style. Side angle view, smooth motion, dark simple background.' },
    { exercise: 'kettlebell_swing', prompt: 'Animate the character in this uploaded image performing a flawless kettlebell swing, maintaining the exact illustrated art style. Side angle view, smooth motion, dark simple background.' },
    { exercise: 'kettlebell_goblet_squat', prompt: 'Animate the character in this uploaded image performing a flawless kettlebell goblet squat, maintaining the exact illustrated art style. Side angle view, smooth motion, dark simple background.' },
    { exercise: 'kettlebell_clean', prompt: 'Animate the character in this uploaded image performing a flawless single-arm kettlebell clean, maintaining the exact illustrated art style. Side angle view, smooth motion, dark simple background.' },
  ],
};

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not set.');
    console.error('Run: GEMINI_API_KEY=$(grep GEMINI_API_KEY .env.local | cut -d= -f2) npx tsx scripts/generate-exercise-demos.ts <workout>');
    process.exit(1);
  }

  const workoutName = process.argv[2];
  if (!workoutName || !WORKOUTS[workoutName]) {
    console.error(`Available workouts: ${Object.keys(WORKOUTS).join(', ')}`);
    process.exit(1);
  }

  const exercises = WORKOUTS[workoutName];
  console.log(`\n🎬 Generating ${exercises.length} demo videos for "${workoutName}" using Veo 3.1...\n`);

  if (!fs.existsSync(AVATAR_PATH)) {
    console.error(`Avatar not found: ${AVATAR_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Read avatar image
  const imageBytes = fs.readFileSync(AVATAR_PATH).toString('base64');

  let success = 0;
  for (const { exercise, prompt } of exercises) {
    const outputPath = path.join(OUTPUT_DIR, `${exercise}.mp4`);

    if (fs.existsSync(outputPath)) {
      console.log(`  ✓ SKIP ${exercise}.mp4 (exists)`);
      success++;
      continue;
    }

    console.log(`  ⏳ ${exercise}...`);
    console.log(`    Submitting...`);

    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt,
        image: {
          imageBytes,
          mimeType: 'image/png',
        },
        config: {
          aspectRatio: '9:16',
        },
      });

      // Poll until done
      console.log(`    Generating (1-5 min)...`);
      while (!operation.done) {
        process.stdout.write('.');
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
      }
      console.log('');

      // Download
      if (operation.response?.generatedVideos?.[0]?.video) {
        console.log(`    Downloading...`);
        await ai.files.download({
          file: operation.response.generatedVideos[0].video,
          downloadPath: outputPath,
        });
        const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
        console.log(`  ✓ ${exercise}.mp4 (${sizeMB} MB)`);
        success++;
      } else {
        console.log(`  ✗ No video in response: ${exercise}`);
      }
    } catch (e: any) {
      console.error(`  ✗ Error: ${e.message || e}`);
    }

    // Brief pause
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`\n✅ Done! ${success}/${exercises.length} videos generated.`);
  console.log(`   Files: ${OUTPUT_DIR}/`);
}

main().catch(console.error);
