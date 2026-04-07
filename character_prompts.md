29% λ > please provide an example prompt for gemini. As a reminder, the 
expertise is in tiers (12 exercises x 5 levels). So 0-11, 12-23, so on and 
so on. Depending on which tier you are (maybe there's a better word for 
it), dictates how strong, powerful, and cool the character looks. Career 
xp currently dictates the gear that can be purchased for that character. 
so you could test and be level 55 and look incredibly cool and strong, but 
your gear would still be basic if you're just starting

> 

Here are example prompts for Gemini, organized by what you'd need to 
generate:

## Base Bodies (10 total: 5 tiers × 2 body types)

Tier 1 (Expertise 0-11) — Novice:
│ Full body character, front-facing, standing pose, transparent 
background, digital art style, consistent 
proportions. A beginner athlete, average build, slightly soft physique. 
Wearing plain grey t-shirt and black 
shorts. Neutral expression, arms at sides. Clean lines, game character 
style, no background elements. 512x512px.

Tier 2 (Expertise 12-23) — Developing:
│ Full body character, front-facing, standing pose, transparent 
background, digital art style, same proportions as 
reference. An intermediate athlete, lean and toned, visible muscle 
definition in arms and shoulders. Wearing fitted
athletic shirt and shorts. Confident posture, slight chest-out stance. 
Clean lines, game character style. 
512x512px.

Tier 3 (Expertise 24-35) — Athletic:
│ Full body character, front-facing, power stance, transparent 
background, digital art style, same proportions as 
reference. An advanced athlete, muscular build, defined arms/chest/legs. 
Wearing compression shirt and athletic 
shorts. Strong confident posture, feet shoulder-width apart. Subtle 
intensity in expression. Clean lines, game 
character style. 512x512px.

Tier 4 (Expertise 36-47) — Elite:
│ Full body character, front-facing, heroic stance, transparent 
background, digital art style, same proportions as 
reference. An elite athlete, heavily muscular, powerful proportions, thick 
arms and broad shoulders. Wearing 
sleeveless compression top and fitted shorts. Commanding presence, arms 
slightly flexed. Intense focused 
expression. Clean lines, game character style. 512x512px.

Tier 5 (Expertise 48-60) — Legendary:
│ Full body character, front-facing, dominant power pose, transparent 
background, digital art style, same 
proportions as reference. A legendary-tier superhuman athlete, peak 
muscular development, imposing proportions, 
vascular arms. Wearing minimal athletic wear showing physique. Radiating 
power and confidence. Jaw-set 
determination. Clean lines, game character style. 512x512px.

For female variants, add: "Female athlete," and adjust the clothing 
descriptions (sports bra + leggings, etc.).

## Key Tips for Consistency

1. Generate tier 1 first, then reference it in subsequent prompts: "Same 
art style, same character proportions as [
attached reference image], but more muscular"
2. Always specify: transparent background, front-facing, same canvas size, 
same foot placement
3. Batch by gender: Do all 5 male tiers, then all 5 female tiers, 
referencing the first of each set
4. Remove backgrounds: Even with "transparent background" in the prompt, 
you may need to run them through a 
background remover (remove.bg or similar)

## Gear Pieces (separate from bodies)

For gear overlays, you'd prompt per slot:

│ Fantasy warrior helmet, front-facing view, transparent background, 
digital art style matching [reference]. 
Positioned as if worn on a character's head. No body visible, just the 
helmet floating in position. 512x512px, same
canvas as character reference.

The key constraint: every gear piece needs to align to the same anchor 
points as the body, so they layer correctly.
That's the hardest part — you may need to manually adjust positioning in 
an image editor after generation.

## Naming Convention

Save them as:
public/characters/bodies/male-tier1.png
public/characters/bodies/male-tier2.png
...
public/characters/bodies/female-tier5.png
public/characters/gear/head/warrior-helm.png
public/characters/gear/torso/samurai-armor.png


Then update CharacterAvatar.tsx to use .png instead of .svg for the body 
images. Want me to update the component to
support both formats, or wait until you've generated some images to test 
with?

 ▸ Credits: 0.59 • Time: 26s

29% λ > please provide for each of the other themes too

> 

## Athlete Theme (Default)

Tier 1 — Rookie:
│ Full body character, front-facing, standing pose, transparent 
background, digital art style. A beginner athlete, 
average build, slightly soft physique. Wearing plain grey t-shirt and 
black athletic shorts, basic sneakers. 
Neutral expression, arms at sides. Clean lines, game character style, 
512x512px.

Tier 2 — Amateur:
│ Same art style and proportions as reference. An intermediate athlete, 
lean and toned, visible muscle definition. 
Wearing fitted athletic shirt and shorts, running shoes. Confident 
posture. 512x512px, transparent background.

Tier 3 — Contender:
│ Same art style. An advanced athlete, muscular build, defined 
arms/chest/legs. Wearing compression shirt and 
athletic shorts, quality training shoes. Power stance, feet 
shoulder-width. 512x512px, transparent background.

Tier 4 — Champion:
│ Same art style. An elite athlete, heavily muscular, broad shoulders. 
Wearing sleeveless compression top, fitted 
shorts, premium athletic shoes. Commanding presence, arms slightly flexed. 
512x512px, transparent background.

Tier 5 — Legend:
│ Same art style. A legendary superhuman athlete, peak muscular 
development, imposing proportions. Wearing minimal 
athletic wear showing physique, championship-level gear. Radiating power 
and confidence. 512x512px, transparent 
background.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## Draconic Theme

Tier 1 — Egg:
│ Full body character, front-facing, transparent background, dark fantasy 
digital art style. A young dragon-blooded
human, slim build, faint scale-like markings on forearms. Wearing tattered 
dark robes. Timid posture, eyes with 
slight reptilian slit. Muted earth tones. 512x512px.

Tier 2 — Hatchling:
│ Same art style. A developing dragon warrior, lean build with visible 
scales on arms and neck. Wearing leather 
armor with scale-like texture. Small horn nubs on forehead. Alert stance, 
clawed hands. Warm amber tones. 
512x512px, transparent background.

Tier 3 — Drake:
│ Same art style. A powerful dragon warrior, muscular with prominent 
scales across arms, shoulders, and neck. 
Wearing dark scaled armor. Short horns curving back from forehead. 
Aggressive stance, glowing amber eyes. Red and 
black tones. 512x512px, transparent background.

Tier 4 — Elder Dragon:
│ Same art style. A fearsome dragon knight, heavily muscular, scales 
covering torso and arms. Wearing ornate dragon
-scale plate armor. Large curved horns, tail visible. Wings folded behind 
back. Burning orange eyes. 512x512px, 
transparent background.

Tier 5 — Archdragon:
│ Same art style. An ancient dragon lord, massive muscular frame, fully 
scaled skin. Wearing legendary dragon armor
with glowing runes. Grand horns like a crown, large wings spread slightly. 
Eyes blazing with fire. Smoke wisps 
rising from shoulders. 512x512px, transparent background.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## Samurai Theme

Tier 1 — Peasant:
│ Full body character, front-facing, transparent background, feudal 
Japanese digital art style. A humble villager, 
average build. Wearing simple brown kimono and straw sandals. Modest 
posture, hands together. Muted earth tones. 
512x512px.

Tier 2 — Ashigaru:
│ Same art style. A foot soldier, lean and wiry. Wearing basic ashigaru 
armor — simple chest plate over dark 
clothing, conical jingasa hat. Holding a wooden training staff. Alert 
stance. 512x512px, transparent background.

Tier 3 — Ronin:
│ Same art style. A masterless samurai, muscular and weathered. Wearing 
worn but quality hakama and gi, one 
shoulder exposed showing scars. Katana at hip. Wind-blown hair, intense 
eyes. 512x512px, transparent background.

Tier 4 — Daimyo:
│ Same art style. A warlord, powerful build, commanding presence. Wearing 
ornate samurai armor (yoroi) with clan 
crest, kabuto helmet with crescent moon crest. Katana drawn at side. 
512x512px, transparent background.

Tier 5 — Shogun:
│ Same art style. The supreme commander, peak warrior physique. Wearing 
legendary gold-trimmed samurai armor, 
elaborate kabuto with flowing mane. Dual katanas. Aura of absolute 
authority. Cherry blossom petals floating 
around. 512x512px, transparent background.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## Apex Predator Theme

Tier 1 — Fossil:
│ Full body character, front-facing, transparent background, 
prehistoric/primal digital art style. A primitive 
human, average build. Wearing basic animal hide clothing, barefoot. 
Cautious posture, looking around nervously. 
Earthy muted tones. 512x512px.

Tier 2 — Compy:
│ Same art style. A young hunter, lean and quick. Wearing fitted hide 
armor with small bone decorations. Crouched 
slightly, ready to sprint. Raptor claw necklace. Alert predatory eyes. 
512x512px, transparent background.

Tier 3 — Raptor:
│ Same art style. A skilled predator, muscular and agile. Wearing 
raptor-hide armor with claw gauntlets, bone 
spikes on shoulders. Aggressive forward lean, teeth bared. War paint on 
face. 512x512px, transparent background.

Tier 4 — T-Rex:
│ Same art style. A dominant apex hunter, heavily muscular, massive 
frame. Wearing thick dinosaur-hide armor with T
-Rex skull pauldron, bone weapons. Thunderous power stance. Primal war 
paint, scars. 512x512px, transparent Kiro is having trouble responding 
right now: 
  0: Failed to receive the next message: request_id: 
659d9ec5-b117-4d8c-a7e7-85a464885bb5, error: dispatch failure (io error): 
request or response body error

Location:
  crates/chat-cli/src/cli/chat/mod.rs:1649

Backtrace omitted. Run with RUST_BACKTRACE=1 environment variable to 
display it.
Run with RUST_BACKTRACE=full to include source snippets.

29% λ > please provide predator again, we got cut off 

> 

I don't have context from a previous conversation about a "predator" 
prompt — we may have been in a different 
chat session. But based on your Apex Predator theme 
(dinosaur/prehistoric), here are the Gemini prompts for that 
theme's gear set:

## Apex Predator Theme — Gear Prompts

Head:
│ Fantasy dinosaur-themed helmet, front-facing view, transparent 
background, digital art game style. Raptor skull 
crown with sharp teeth along the brow, bone-white and dark green accents. 
Positioned as if worn on a character's 
head. No body visible. 512x512px.

Torso:
│ Prehistoric hunter chest armor, front-facing view, transparent 
background, digital art game style. Scaled hide 
armor with raptor claw shoulder pauldrons, dark green and brown leather 
with bone reinforcements. Positioned as if 
worn on a character's torso. No body visible. 512x512px.

Legs:
│ Prehistoric hunter leg armor, front-facing view, transparent 
background, digital art game style. Dinosaur hide 
greaves with bone shin guards, dark green scaled leather wrapping around 
legs. Positioned as if worn on character's
legs. No body visible. 512x512px.

Accessory:
│ Dinosaur tooth necklace and bone belt, front-facing view, transparent 
background, digital art game style. Large T
-Rex teeth strung on leather cord, with a utility belt made of raptor 
claws and bone. 512x512px.

Weapon:
│ Prehistoric bone weapon, front-facing view, transparent background, 
digital art game style. A massive club made 
from a dinosaur femur bone, wrapped in leather grip, with sharp fossil 
fragments embedded along the striking edge. 
Held at character's right side. 512x512px.

## Rarity Tiers for Apex Predator

Common (1,000-5,000 XP):
│ Simple dinosaur hide vest, minimal bone accents, worn and weathered 
look. Basic prehistoric hunter gear.

Rare (10,000-25,000 XP):
│ Reinforced raptor scale armor, polished bone pauldrons, green-tinted 
leather with claw marks as decoration.

Epic (50,000-100,000 XP):
│ Full T-Rex bone plate armor, glowing green fossil fragments embedded in 
chest piece, raptor claw gauntlets, 
intimidating presence.

Legendary (150,000+ XP):
│ Spinosaurus spine crown, full prehistoric exoskeleton armor with 
bioluminescent green veins running through 
fossilized plates, massive jaw-bone shoulder pieces, radiating primal 
energy.

Want me to do the other themes too (Athlete, Draconic, Samurai, Viking)?

 ▸ Credits: 0.99 • Time: 1m 31s

30% λ > yes please

> 

## Athlete Theme — Gear Prompts

Head:
│ Athletic headband/cap, front-facing view, transparent background, 
digital art game style. Sports headband with sweat-wicking material, clean 
modern design. Positioned as if worn on a character's head. No body 
visible. 512x512px.

Torso:
│ Athletic performance top, front-facing view, transparent background, 
digital art game style. Fitted compression shirt with subtle geometric 
patterns, modern sports aesthetic, orange and black colorway. Positioned 
as if worn on a character's torso. No body visible. 512x512px.

Legs:
│ Athletic performance shorts, front-facing view, transparent background, 
digital art game style. Fitted training shorts with side stripe detail,
modern sports aesthetic, black with orange accents. Positioned as if worn 
on character's legs. No body visible. 512x512px.

Accessory:
│ Athletic wrist wraps and championship belt, front-facing view, 
transparent background, digital art game style. Thick wrist wraps with 
tape, 
plus a championship-style belt buckle. 512x512px.

Weapon:
│ Sports equipment trophy weapon, front-facing view, transparent 
background, digital art game style. An oversized golden trophy with sharp 
edges,
held like a weapon, gleaming metallic finish. Held at character's right 
side. 512x512px.

Rarity Tiers:
- Common: Plain grey compression shirt, basic headband, simple training 
shorts
- Rare: Branded-looking performance gear, matching colorway, wrist tape, 
athletic socks
- Epic: Elite competition uniform, gold trim accents, championship 
wristbands, custom shoes with glow
- Legendary: Full Hall of Fame outfit — golden compression suit with 
luminous orange veins, floating championship rings, crown-like headband 
with
embedded gems

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## Draconic Theme — Gear Prompts

Head:
│ Dragon horn crown, front-facing view, transparent background, digital 
art game style. Curved dragon horns emerging from a dark iron circlet, 
glowing red runes etched into the metal, embers floating near tips. 
Positioned as if worn on a character's head. No body visible. 512x512px.

Torso:
│ Dragon scale chest armor, front-facing view, transparent background, 
digital art game style. Overlapping crimson and black dragon scales 
forming a breastplate, molten cracks glowing orange between plates, smoke 
wisps rising from shoulders. Positioned as if worn on a character's 
torso. No body visible. 512x512px.

Legs:
│ Dragon scale leg armor, front-facing view, transparent background, 
digital art game style. Dark crimson scaled greaves with molten orange 
veins, clawed knee guards shaped like dragon talons. Positioned as if worn 
on character's legs. No body visible. 512x512px.

Accessory:
│ Dragon wing cape, front-facing view, transparent background, digital 
art game style. Tattered dragon wing membrane draped as a cape, dark red 
with glowing vein patterns, clasped at the collar with a dragon eye 
brooch. 512x512px.

Weapon:
│ Dragon fang blade, front-facing view, transparent background, digital 
art game style. A massive sword forged from a dragon's fang, obsidian 
black blade with molten orange edge, dragon leather grip, smoke trailing 
from the tip. Held at character's right side. 512x512px.

Rarity Tiers:
- Common: Simple iron circlet with nub horns, basic dark leather vest with 
a few scales sewn on
- Rare: Polished dragon scale pauldrons, red-tinted iron armor, small horn 
crown, ember glow on edges
- Epic: Full crimson dragon plate armor, large curved horns, molten cracks 
across chest piece, dragon claw gauntlets
- Legendary: Ancient dragon exoskeleton armor, massive spiraling horns 
wreathed in flame, full wing cape with glowing veins, blade dripping with 
lava, eyes glow red through visor

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## Samurai Theme — Gear Prompts

Head:
│ Samurai kabuto helmet, front-facing view, transparent background, 
digital art game style. Traditional Japanese war helmet with crescent moon 
crest (maedate), dark iron with red lacquer accents, face guard (menpo) 
with fierce expression. Positioned as if worn on a character's head. No 
body visible. 512x512px.

Torso:
│ Samurai do chest armor, front-facing view, transparent background, 
digital art game style. Traditional Japanese chest plate (do) with layered 
lamellar plates, dark iron and crimson red lacing (odoshi), gold clan 
crest on chest. Positioned as if worn on a character's torso. No body 
visible. 512x512px.

Legs:
│ Samurai suneate leg armor, front-facing view, transparent background, 
digital art game style. Layered shin guards with red lacing over dark 
hakama pants, traditional Japanese armor aesthetic. Positioned as if worn 
on character's legs. No body visible. 512x512px.

Accessory:
│ Samurai sashimono banner and obi belt, front-facing view, transparent 
background, digital art game style. A small back-mounted war banner with 
clan symbol, plus ornate silk obi belt with gold thread. 512x512px.

Weapon:
│ Katana sword, front-facing view, transparent background, digital art 
game style. A beautifully crafted katana with curved blade, ray-skin grip 
wrapped in dark silk, circular tsuba guard with cherry blossom engraving, 
sheathed at the hip. Held at character's left side. 512x512px.

Rarity Tiers:
- Common: Simple ashigaru foot soldier gear — straw hat (jingasa), basic 
cloth armor, wooden sandals
- Rare: Ronin wanderer set — weathered iron armor, half-face mask, single 
katana, tattered cloak
- Epic: Full samurai yoroi armor — lacquered plates, ornate kabuto with 
crest, dual katana, silk sash
- Legendary: Shogun's divine armor — gold-inlaid black lacquer plates, 
towering kabuto with dragon crest, glowing cherry blossom petals swirling 
around, legendary blade with ethereal blue edge

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## Viking Theme — Gear Prompts

Head:
│ Viking war helmet, front-facing view, transparent background, digital 
art game style. Iron spectacle helmet with nose guard, fur-lined rim, 
weathered and battle-scarred metal, no horns (historically accurate). 
Positioned as if worn on a character's head. No body visible. 512x512px.

Torso:
│ Viking chainmail and fur armor, front-facing view, transparent 
background, digital art game style. Riveted chainmail hauberk over leather 
tunic, thick bear fur draped over one shoulder, iron disc brooch clasp, 
Norse knotwork belt. Positioned as if worn on a character's torso. No 
body visible. 512x512px.

Legs:
│ Viking leg wraps and boots, front-facing view, transparent background, 
digital art game style. Wool trousers with leather leg wraps (winingas) 
crisscrossing up the calves, heavy leather boots with iron toe caps. 
Positioned as if worn on character's legs. No body visible. 512x512px.

Accessory:
│ Viking fur cloak and arm rings, front-facing view, transparent 
background, digital art game style. Heavy wolf fur cloak pinned with a 
Thor's 
hammer brooch, thick silver arm rings with Norse rune engravings on both 
biceps. 512x512px.

Weapon:
│ Viking bearded axe, front-facing view, transparent background, digital 
art game style. A large single-handed bearded axe with wide cutting 
edge, ash wood handle wrapped in leather, Norse runes carved into the 
blade, iron pommel. Held at character's right side. 512x512px.

Rarity Tiers:
- Common: Thrall gear — simple wool tunic, leather belt, no armor, basic 
cloth wraps
- Rare: Warrior set — basic chainmail, leather bracers, iron helmet, 
single hand axe, fur trim
- Epic: Berserker set — bear pelt hood and cloak, war-painted chainmail, 
dual axes, rune-etched arm rings, wild intensity
- Legendary: Einherjar (chosen of Valhalla) — gleaming frost-touched 
chainmail, massive wolf pelt cloak, glowing blue Norse runes floating 
around
body, legendary axe crackling with lightning, one eye glowing (Odin's 
blessing)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


For all themes, always append to the prompt: "Same art style as [attach 
your tier 1 body reference], same canvas size 512x512, same character 
positioning for proper overlay alignment."
