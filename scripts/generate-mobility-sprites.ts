import * as fs from 'fs';
import * as path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const OUTPUT_BASE = path.join(process.cwd(), 'public/enemies');

const PROMPTS: { theme: string; exercise: string; tier: number; prompt: string }[] = [
  // SAMURAI
  { theme: 'samurai', exercise: 'deep_squat_hold', tier: 0, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A small jade-colored tortoise with a cracked shell, glowing faintly. Compact and still — patient and ancient. Color palette: jade green shell, indigo shadows, faint cherry-blossom pink glow in the cracks. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'samurai', exercise: 'deep_squat_hold', tier: 1, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A medium jade tortoise spirit with a mossy shell covered in ancient kanji, legs planted wide in a low stable stance. Cherry blossom petals drift around it. Color palette: deep jade green, indigo moss patterns, cherry-blossom pink kanji glowing on shell. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'samurai', exercise: 'deep_squat_hold', tier: 2, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A massive ancient tortoise deity, shell carved with an entire temple landscape. Four legs rooted like pillars into the ground. A cherry tree grows from its back. Radiates stillness and immovable power. Color palette: dark jade with gold trim, indigo temple details, cherry-blossom pink tree and aura. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'samurai', exercise: 'cossack_squat', tier: 0, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A tiny fox spirit (kitsune) with one tail, sitting with legs split to one side. Playful and quick. Color palette: white and silver fur, indigo ear tips, faint cherry-blossom pink eye glow. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'samurai', exercise: 'cossack_squat', tier: 1, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A graceful three-tailed kitsune in a wide lateral stance, one leg extended. Body shimmers between solid and translucent — a mirror spirit. Color palette: silver and white fur, indigo spectral flames on tail tips, cherry-blossom pink mirror reflections. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'samurai', exercise: 'cossack_squat', tier: 2, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A magnificent nine-tailed kitsune deity in full lateral split, body entirely made of reflective mirror shards. Each tail ends in a different weapon reflection. Cherry blossoms swirl in the reflections. Color palette: mirror silver, indigo void between shards, cherry-blossom pink energy connecting the fragments. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'samurai', exercise: 'l_sit_hold', tier: 0, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A small ghostly monk in tattered robes, hovering just barely off the ground with legs extended forward. Translucent and simple. Color palette: pale grey robes, indigo spirit wisps, faint cherry-blossom pink glow beneath. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'samurai', exercise: 'l_sit_hold', tier: 1, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A spectral warrior monk suspended in the air in an L-sit position, legs perfectly horizontal. Prayer beads float around him. Visible discipline and control. Color palette: white and indigo robes, cherry-blossom pink energy rings at wrists where he supports himself on nothing. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'samurai', exercise: 'l_sit_hold', tier: 2, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. An enlightened floating master — entire body levitating high with legs extended, surrounded by orbiting temple bells and sacred scrolls. Energy pours downward like a waterfall beneath him. Color palette: pure white robes with gold trim, indigo scrolls, cherry-blossom pink energy cascade and halo. Facing left. Hard pixel edges, no antialiasing.' },
  // DRAGON
  { theme: 'dragon', exercise: 'deep_squat_hold', tier: 0, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A small squat toad made of cooling lava rock, with dim orange cracks. Sits low and unmoving. Color palette: dark grey rock, faint red/orange glow in cracks, gold eyes. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'dragon', exercise: 'deep_squat_hold', tier: 1, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A bulky magma toad with molten lava visible between obsidian plates. Crouched in a wide stable stance. Steam rises from its back. Color palette: obsidian black, red-orange magma veins, gold dripping from its mouth. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'dragon', exercise: 'deep_squat_hold', tier: 2, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A colossal volcanic toad demon, body is a living volcano in toad form. Lava flows down its sides, obsidian crown of horns. Absolutely immovable. Color palette: black obsidian shell, bright red-orange lava rivers, gold molten crown. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'dragon', exercise: 'cossack_squat', tier: 0, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A small two-headed serpent, each head pulling in opposite directions. Thin and young. Color palette: dark red scales, dim gold eyes on each head. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'dragon', exercise: 'cossack_squat', tier: 1, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A forked dragon wyrm with its body splitting into two directions — one leg-like appendage stretched wide. Wings folded. Looks flexible and dangerous. Color palette: crimson scales, gold bone spines along the split, red fire in both mouths. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'dragon', exercise: 'cossack_squat', tier: 2, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A massive twin-bodied dragon deity, the two halves connected at the core but stretching in opposite directions. Each half breathes a different colored fire. Fills the frame. Color palette: deep crimson and black scales, gold armor plates at the junction, red and gold dual flames. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'dragon', exercise: 'l_sit_hold', tier: 0, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A tiny floating ember — a wisp of fire vaguely humanoid, with legs stretched forward. Barely formed. Color palette: dim orange-red glow, dark red core. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'dragon', exercise: 'l_sit_hold', tier: 1, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A fire wraith suspended mid-air in L-sit position — skeletal form made of hardened ash with fire burning inside. Arms press down on nothing, legs held rigidly forward. Color palette: charcoal black skeleton, red-orange fire within, gold ember particles rising. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'dragon', exercise: 'l_sit_hold', tier: 2, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A legendary fire elemental lord, body entirely of controlled flame in perfect L-sit suspension. A ring of fire orbits beneath where hands press. Crown of gold flames above. Pure discipline of fire given form. Color palette: white-hot core, red-orange outer flames, gold crown and orbit ring. Facing left. Hard pixel edges, no antialiasing.' },
  // VIKING
  { theme: 'viking', exercise: 'deep_squat_hold', tier: 0, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A small ice crab with frozen shell, low and wide stance. Simple and sturdy. Color palette: pale blue shell, steel grey legs, faint ice white frost. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'viking', exercise: 'deep_squat_hold', tier: 1, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A large armored frost crab with icicle-encrusted shell, legs spread wide and planted firmly. Frost emanates from beneath it. Color palette: steel blue armor plates, ice white crystal growths, pale blue frost mist. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'viking', exercise: 'deep_squat_hold', tier: 2, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A colossal glacial crab king — shell is an entire frozen fortress. Legs are frozen columns. Nothing can move this creature. Blizzard swirls around it. Color palette: dark steel blue, ice white fortress details, pale blue blizzard particles. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'viking', exercise: 'cossack_squat', tier: 0, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A small ice fairy mid-lateral glide on a frozen surface. Delicate and quick. Color palette: pale blue body, ice white wings, steel blue ice trail. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'viking', exercise: 'cossack_squat', tier: 1, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A frost valkyrie in a wide lateral lunge, one ice blade extended with the stretched leg. Hair and cape flowing with frozen movement. Color palette: steel blue armor, ice white hair and blade, pale blue frost trail. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'viking', exercise: 'cossack_squat', tier: 2, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A legendary frost goddess in full lateral split, body made of living ice crystals. Twin blades of pure cold extend from her hands. Aurora borealis shimmers behind her. Color palette: crystalline ice blue body, ice white blades, steel blue aurora with pale green hints. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'viking', exercise: 'l_sit_hold', tier: 0, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A small undead viking spirit barely floating, legs stiff forward. Faint blue glow. Simple and eerie. Color palette: grey-blue translucent body, ice white eyes, faint steel blue glow. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'viking', exercise: 'l_sit_hold', tier: 1, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A frozen draugr warrior suspended mid-air in L-sit position, wearing corroded viking armor. Ice chains hang from wrists. Disciplined undead rage. Color palette: steel blue armor, ice white frozen skin, pale blue spectral chains. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'viking', exercise: 'l_sit_hold', tier: 2, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. An ancient draugr lord levitating above a frozen rune circle, legs perfectly extended. Full viking king armor encased in ice. Runes glow beneath him. Color palette: dark steel blue armor with gold rune inlays, ice white face, pale blue rune circle below. Facing left. Hard pixel edges, no antialiasing.' },
  // DINOSAUR
  { theme: 'dinosaur', exercise: 'deep_squat_hold', tier: 0, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A small prehistoric turtle with a thick mossy shell, sitting low. Ancient and patient. Color palette: dark green shell, forest green moss, faint amber eye glow. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'dinosaur', exercise: 'deep_squat_hold', tier: 1, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A large armored prehistoric turtle with spikes on its shell and legs planted wide. Trees grow from moss on its back. Immovable. Color palette: forest green armor plates, amber spike tips, dark green jungle moss. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'dinosaur', exercise: 'deep_squat_hold', tier: 2, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A colossal world-turtle — an entire jungle ecosystem lives on its back. Ancient beyond measure, legs like tree trunks rooted to the earth. Fills the frame. Color palette: dark forest green shell, amber glowing ancient markings, green jungle canopy on top. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'dinosaur', exercise: 'cossack_squat', tier: 0, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A small young raptor with one leg extended to the side mid-stretch. Agile and flexible. Color palette: forest green scales, amber eyes, dark green stripes. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'dinosaur', exercise: 'cossack_squat', tier: 1, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A sleek adult raptor in a wide lateral stance, claws extended on the stretched leg. Feathered crest raised. Looks acrobatic and lethal. Color palette: forest green scales, amber feathered crest, dark green body stripes. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'dinosaur', exercise: 'cossack_squat', tier: 2, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A legendary alpha raptor in full lateral split, body covered in golden feathers and ancient war paint. Both sickle claws fully extended. Pack leader energy. Color palette: dark forest green base, gold/amber plumage, green jungle war paint markings. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'dinosaur', exercise: 'l_sit_hold', tier: 0, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A small tangle of vines vaguely humanoid, suspended off the ground with vine-legs extended forward. Color palette: dark green vines, faint amber glow in center. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'dinosaur', exercise: 'l_sit_hold', tier: 1, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A jungle spirit made of woven vines and branches, suspended in L-sit position. Amber flowers bloom where hands press down. Controlled and ancient. Color palette: dark forest green vines, amber flowers and pollen, green leaves. Facing left. Hard pixel edges, no antialiasing.' },
  { theme: 'dinosaur', exercise: 'l_sit_hold', tier: 2, prompt: '64x64 pixel art sprite, transparent background, SNES RPG bestiary style. A legendary treant lord levitating in perfect L-sit, body is an ancient tree with a face. Roots dangle beneath like a waterfall. Canopy crown of golden leaves. Commands the jungle through stillness. Color palette: dark bark brown-green trunk, amber-gold leaf crown, forest green hanging vines and roots. Facing left. Hard pixel edges, no antialiasing.' },
];

async function generateImage(prompt: string): Promise<Buffer | null> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-3.1-flash-image',
      input: [{ type: 'text', text: prompt }],
      response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '1:1' },
    }),
  });

  if (!res.ok) {
    console.error(`API error: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.error(text.slice(0, 200));
    return null;
  }

  const json = await res.json();

  // Extract image from response steps
  for (const step of json.steps || []) {
    if (step.type === 'model_output') {
      for (const block of step.content || []) {
        if (block.type === 'image' && block.data) {
          return Buffer.from(block.data, 'base64');
        }
      }
    }
  }

  // Try output_image convenience property
  if (json.output_image?.data) {
    return Buffer.from(json.output_image.data, 'base64');
  }

  console.error('No image in response');
  return null;
}

async function main() {
  console.log(`Generating ${PROMPTS.length} mobility enemy sprites...`);
  let success = 0;
  let failed = 0;

  for (const p of PROMPTS) {
    const dir = path.join(OUTPUT_BASE, p.theme);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filename = `${p.exercise}_t${p.tier}.png`;
    const filepath = path.join(dir, filename);

    // Skip if already exists
    if (fs.existsSync(filepath)) {
      console.log(`✓ SKIP ${p.theme}/${filename} (exists)`);
      success++;
      continue;
    }

    console.log(`⏳ Generating ${p.theme}/${filename}...`);
    const imageBuffer = await generateImage(p.prompt);

    if (imageBuffer) {
      fs.writeFileSync(filepath, imageBuffer);
      console.log(`✓ Saved ${p.theme}/${filename} (${imageBuffer.length} bytes)`);
      success++;
    } else {
      console.log(`✗ FAILED ${p.theme}/${filename}`);
      failed++;
    }

    // Rate limit: ~2 seconds between requests
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\nDone! ${success} succeeded, ${failed} failed.`);
}

main().catch(console.error);
