/**
 * Generate enemy sprites for a new ranked exercise.
 * 
 * Usage: npx tsx scripts/generate-exercise-sprites.ts <exercise_id> \
 *   --samurai "Creature Name" \
 *   --dragon "Creature Name" \
 *   --viking "Creature Name" \
 *   --dinosaur "Creature Name" \
 *   --desc "Brief description of what the creature represents"
 * 
 * Example:
 *   npx tsx scripts/generate-exercise-sprites.ts l_sit_hold \
 *     --samurai "Floating Monk" \
 *     --dragon "Ember Wraith" \
 *     --viking "Hovering Draugr" \
 *     --dinosaur "Vine Phantom" \
 *     --desc "A creature that floats/levitates, representing core control and suspension"
 * 
 * Generates 12 images (4 themes × 3 tiers) and post-processes them.
 */
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const OUTPUT_BASE = path.join(process.cwd(), 'public/enemies');
const TARGET_SIZE = 64;

interface ThemeConfig {
  key: string;
  palette: string;
  bgColor: string;
}

const THEMES: ThemeConfig[] = [
  { key: 'samurai', palette: 'indigo/deep purple with cherry-blossom pink accents', bgColor: '#0a0a12' },
  { key: 'dragon', palette: 'deep red/crimson with gold accents', bgColor: '#0f0808' },
  { key: 'viking', palette: 'steel blue with ice white accents', bgColor: '#08090f' },
  { key: 'dinosaur', palette: 'forest green with amber accents', bgColor: '#080f08' },
];

const TIER_DESCRIPTIONS = [
  { tier: 0, size: 'small', level: 'Levels 0-1', desc: 'Compact, simple, unimposing. Just awakened or barely formed.' },
  { tier: 1, size: 'medium', level: 'Levels 2-3', desc: 'Grown, detailed, menacing. Shows power and presence.' },
  { tier: 2, size: 'boss', level: 'Levels 4-5', desc: 'Massive, legendary, fills the frame. Radiates power and mastery.' },
];

function buildPrompt(creatureName: string, theme: ThemeConfig, tier: typeof TIER_DESCRIPTIONS[number], exerciseDesc: string): string {
  return `64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A ${tier.size} ${creatureName}. ${tier.desc} ${exerciseDesc} Color palette: ${theme.palette}. Facing left. Hard pixel edges, no antialiasing.`;
}

async function generateImage(prompt: string): Promise<Buffer | null> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'x-goog-api-key': GEMINI_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-3.1-flash-image',
      input: [{ type: 'text', text: prompt }],
      response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '1:1' },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  API error: ${res.status} — ${text.slice(0, 150)}`);
    return null;
  }

  const json = await res.json();
  for (const step of json.steps || []) {
    if (step.type === 'model_output') {
      for (const block of step.content || []) {
        if (block.type === 'image' && block.data) return Buffer.from(block.data, 'base64');
      }
    }
  }
  if (json.output_image?.data) return Buffer.from(json.output_image.data, 'base64');
  return null;
}

async function removeBackgroundAndResize(imageBuffer: Buffer): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const { width, height } = await image.metadata();
  if (!width || !height) throw new Error('Cannot read image metadata');

  const raw = await image.ensureAlpha().raw().toBuffer();
  const pixels = new Uint8Array(raw);

  const getPixel = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    return { r: pixels[idx], g: pixels[idx + 1], b: pixels[idx + 2], a: pixels[idx + 3] };
  };

  // Flood fill from corners to find background
  const visited = new Uint8Array(width * height);
  const bgMask = new Uint8Array(width * height);
  const tolerance = 35;
  const queue: [number, number][] = [];

  const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
  for (const [cx, cy] of corners) {
    const ref = getPixel(cx, cy);
    if (ref.a === 0) continue;
    queue.push([cx, cy]);

    while (queue.length > 0) {
      const [x, y] = queue.pop()!;
      const idx = y * width + x;
      if (visited[idx]) continue;
      visited[idx] = 1;

      const p = getPixel(x, y);
      if (Math.abs(p.r - ref.r) >= tolerance || Math.abs(p.g - ref.g) >= tolerance || Math.abs(p.b - ref.b) >= tolerance) continue;
      bgMask[idx] = 1;

      if (x > 0) queue.push([x - 1, y]);
      if (x < width - 1) queue.push([x + 1, y]);
      if (y > 0) queue.push([x, y - 1]);
      if (y < height - 1) queue.push([x, y + 1]);
    }
  }

  for (let i = 0; i < width * height; i++) {
    if (bgMask[i]) pixels[i * 4 + 3] = 0;
  }

  return await sharp(Buffer.from(pixels), { raw: { width, height, channels: 4 } })
    .resize(TARGET_SIZE, TARGET_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

function parseArgs(): { exerciseId: string; creatures: Record<string, string>; desc: string } {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(`Usage: npx tsx scripts/generate-exercise-sprites.ts <exercise_id> \\
  --samurai "Creature Name" \\
  --dragon "Creature Name" \\
  --viking "Creature Name" \\
  --dinosaur "Creature Name" \\
  --desc "Brief exercise/creature description"`);
    process.exit(1);
  }

  const exerciseId = args[0];
  const creatures: Record<string, string> = {};
  let desc = '';

  for (let i = 1; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const val = args[i + 1];
    if (key === 'desc') desc = val;
    else creatures[key] = val;
  }

  return { exerciseId, creatures, desc };
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not set. Run with: GEMINI_API_KEY=... npx tsx scripts/generate-exercise-sprites.ts ...');
    process.exit(1);
  }

  const { exerciseId, creatures, desc } = parseArgs();
  const total = Object.keys(creatures).length * 3;
  console.log(`\n🎨 Generating ${total} sprites for "${exerciseId}"...\n`);

  let success = 0;
  for (const theme of THEMES) {
    const creatureName = creatures[theme.key];
    if (!creatureName) {
      console.log(`⚠ No creature name for ${theme.key}, skipping`);
      continue;
    }

    const dir = path.join(OUTPUT_BASE, theme.key);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    for (const tierDef of TIER_DESCRIPTIONS) {
      const filename = `${exerciseId}_t${tierDef.tier}.png`;
      const filepath = path.join(dir, filename);

      if (fs.existsSync(filepath)) {
        console.log(`  ✓ SKIP ${theme.key}/${filename} (exists)`);
        success++;
        continue;
      }

      const prompt = buildPrompt(creatureName, theme, tierDef, desc);
      process.stdout.write(`  ⏳ ${theme.key}/${filename}...`);

      const imageBuffer = await generateImage(prompt);
      if (!imageBuffer) {
        console.log(' ✗ FAILED');
        continue;
      }

      const processed = await removeBackgroundAndResize(imageBuffer);
      fs.writeFileSync(filepath, processed);
      const sizeKB = (processed.length / 1024).toFixed(1);
      console.log(` ✓ (${sizeKB}KB)`);
      success++;

      await new Promise(r => setTimeout(r, 2000)); // Rate limit
    }
  }

  console.log(`\n✅ Done! ${success}/${total} sprites generated for "${exerciseId}".`);
  console.log(`   Files: public/enemies/{theme}/${exerciseId}_t{0,1,2}.png`);
}

main().catch(console.error);
