/**
 * Post-process enemy sprites:
 * 1. Remove checkerboard/solid background (make transparent)
 * 2. Resize to 64x64
 * 
 * Usage: npx tsx scripts/process-sprites.ts [glob pattern]
 * Default: processes all new mobility sprites
 * Example: npx tsx scripts/process-sprites.ts "public/enemies/samurai/deep_squat*"
 */
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

const TARGET_SIZE = 64;

// Checkerboard patterns are typically alternating grey/white squares
// We detect the top-left corner color and the adjacent pixel color
// If they alternate in a grid pattern, it's a checkerboard background
async function removeBackground(inputPath: string): Promise<Buffer> {
  const image = sharp(inputPath);
  const { width, height, channels } = await image.metadata();
  
  if (!width || !height) throw new Error(`Cannot read metadata for ${inputPath}`);

  // Get raw pixel data
  const raw = await image.ensureAlpha().raw().toBuffer();
  const pixels = new Uint8Array(raw);
  const stride = width * 4; // RGBA

  // Sample corners to detect background color
  const getPixel = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    return { r: pixels[idx], g: pixels[idx + 1], b: pixels[idx + 2], a: pixels[idx + 3] };
  };

  // Detect checkerboard: sample a few pixels from the top-left area
  const corner1 = getPixel(0, 0);
  const corner2 = getPixel(1, 0);
  const corner3 = getPixel(0, 1);
  
  // Common checkerboard colors from AI generators
  const isCheckerColor = (r: number, g: number, b: number) => {
    // Light grey (typical checkerboard light square)
    if (r >= 190 && r <= 210 && g >= 190 && g <= 210 && b >= 190 && b <= 210) return true;
    // White
    if (r >= 245 && g >= 245 && b >= 245) return true;
    // Darker grey (typical checkerboard dark square)
    if (r >= 140 && r <= 170 && g >= 140 && g <= 170 && b >= 140 && b <= 170) return true;
    // Very light grey
    if (r >= 220 && r <= 240 && g >= 220 && g <= 240 && b >= 220 && b <= 240) return true;
    return false;
  };

  // Check if top-left area looks like a checkerboard or solid bg
  const topLeftIsChecker = isCheckerColor(corner1.r, corner1.g, corner1.b);
  const topRightIsChecker = isCheckerColor(getPixel(width - 1, 0).r, getPixel(width - 1, 0).g, getPixel(width - 1, 0).b);
  const botLeftIsChecker = isCheckerColor(getPixel(0, height - 1).r, getPixel(0, height - 1).g, getPixel(0, height - 1).b);

  if (!topLeftIsChecker && !topRightIsChecker && !botLeftIsChecker) {
    // No checkerboard detected — might already have good background or dark bg
    // Try detecting a solid dark background instead
    const isDarkBg = (r: number, g: number, b: number) => r < 30 && g < 30 && b < 30;
    const hasDarkCorners = isDarkBg(corner1.r, corner1.g, corner1.b) && 
                           isDarkBg(getPixel(width - 1, 0).r, getPixel(width - 1, 0).g, getPixel(width - 1, 0).b);
    
    if (!hasDarkCorners) {
      // No background to remove, just resize
      return await sharp(inputPath).resize(TARGET_SIZE, TARGET_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    }
  }

  // Build a background mask via flood-fill from all four corners
  const visited = new Uint8Array(width * height);
  const bgMask = new Uint8Array(width * height); // 1 = background
  
  const tolerance = 35; // Color similarity threshold
  const queue: [number, number][] = [];

  const isSimilar = (x: number, y: number, refR: number, refG: number, refB: number) => {
    const p = getPixel(x, y);
    return Math.abs(p.r - refR) < tolerance && Math.abs(p.g - refG) < tolerance && Math.abs(p.b - refB) < tolerance;
  };

  // Flood fill from corners
  const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
  for (const [cx, cy] of corners) {
    const ref = getPixel(cx, cy);
    if (ref.a === 0) continue; // Already transparent
    queue.push([cx, cy]);
    
    while (queue.length > 0) {
      const [x, y] = queue.pop()!;
      const idx = y * width + x;
      if (visited[idx]) continue;
      visited[idx] = 1;

      if (!isSimilar(x, y, ref.r, ref.g, ref.b)) continue;
      bgMask[idx] = 1;

      if (x > 0) queue.push([x - 1, y]);
      if (x < width - 1) queue.push([x + 1, y]);
      if (y > 0) queue.push([x, y - 1]);
      if (y < height - 1) queue.push([x, y + 1]);
    }
  }

  // Apply mask — set background pixels to transparent
  for (let i = 0; i < width * height; i++) {
    if (bgMask[i]) {
      pixels[i * 4 + 3] = 0; // Set alpha to 0
    }
  }

  // Write back and resize
  const processed = await sharp(Buffer.from(pixels), { raw: { width, height, channels: 4 } })
    .resize(TARGET_SIZE, TARGET_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return processed;
}

async function main() {
  const pattern = process.argv[2] || 'public/enemies/*/deep_squat_hold_*.png,public/enemies/*/cossack_squat_*.png,public/enemies/*/l_sit_hold_*.png';
  const patterns = pattern.split(',');
  
  let files: string[] = [];
  for (const p of patterns) {
    const matches = globSync(p);
    files.push(...matches);
  }

  if (files.length === 0) {
    console.log('No files found matching pattern. Usage: npx tsx scripts/process-sprites.ts "public/enemies/**/*_t*.png"');
    return;
  }

  console.log(`Processing ${files.length} sprites...`);
  let success = 0;

  for (const file of files) {
    try {
      const processed = await removeBackground(file);
      fs.writeFileSync(file, processed);
      const sizeKB = (processed.length / 1024).toFixed(1);
      console.log(`✓ ${path.basename(file)} → ${TARGET_SIZE}×${TARGET_SIZE} (${sizeKB}KB)`);
      success++;
    } catch (err: any) {
      console.error(`✗ ${path.basename(file)}: ${err.message}`);
    }
  }

  console.log(`\nDone! ${success}/${files.length} processed.`);
}

main().catch(console.error);
