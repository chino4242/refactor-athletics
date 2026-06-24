#!/usr/bin/env python3
"""
Batch generate pixel art sprites via Gemini API, then remove green background.
Usage: GEMINI_API_KEY=your_key python3 scripts/generate-sprites.py
"""
import os
import time
from PIL import Image
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

SUFFIX = " Use a solid bright green (#00FF00) background. Do NOT use transparency or checkerboard."

# ─── SAMURAI AVATARS ───
SAMURAI_AVATARS = {
    "public/avatars/samurai/male_t0.png": "64x64 pixel art sprite, SNES RPG character style. A humble ronin warrior with no armor — wearing a tattered grey gi and worn hakama. Holds a wooden bokken (practice sword) at his side. Barefoot, slightly slouched posture. Simple and unadorned. Color palette: faded grey cloth, indigo shadows, single faint cherry-blossom pink edge on the bokken tip. Facing right. Hard pixel edges, no antialiasing.",
    "public/avatars/samurai/male_t1.png": "64x64 pixel art sprite, SNES RPG character style. A samurai warrior standing upright with light armor — one indigo shoulder plate, a proper katana drawn at ready. Wearing straw sandals and a dark hakama. Confident stance. Color palette: dark indigo armor accent, grey-blue hakama, cherry-blossom pink glow along the katana blade edge. Facing right. Hard pixel edges, no antialiasing.",
    "public/avatars/samurai/male_t2.png": "64x64 pixel art sprite, SNES RPG character style. A daimyo war lord in full samurai armor — kabuto helmet with small horns, chest plate, arm guards, wide power stance. Dual-wielding katana and wakizashi. Imposing and wide silhouette. Color palette: deep indigo armor plates with gold trim, cherry-blossom pink energy crackling between the two blades. Facing right. Hard pixel edges, no antialiasing.",
    "public/avatars/samurai/male_t3.png": "64x64 pixel art sprite, SNES RPG character style. A shogun commander in ornate battle armor with a war banner rising behind him. Horned kabuto with face mask, elaborate shoulder guards, one hand raised commanding. The banner has a cherry blossom crest. Color palette: black and indigo lacquered armor with gold accents, cherry-blossom pink banner crest and weapon glow. Facing right. Hard pixel edges, no antialiasing.",
    "public/avatars/samurai/male_t4.png": "64x64 pixel art sprite, SNES RPG character style. A transcendent legendary warrior — mythical armor that seems alive, wreathed in cherry-blossom energy that radiates outward. Eyes glow pink, spirit petals orbit the body. Katana is pure energy. The figure is mid-action, radiating power that fills the frame. Color palette: indigo-black divine armor, overwhelming cherry-blossom pink aura, spirit petals, glowing eyes. Facing right. Hard pixel edges, no antialiasing.",
    "public/avatars/samurai/female_t0.png": "64x64 pixel art sprite, SNES RPG character style. A humble female ronin warrior with no armor — wearing a tattered grey gi and worn hakama, hair tied back in a simple ponytail. Holds a wooden bokken (practice sword) at her side. Barefoot, slightly slouched posture. Simple and unadorned. Color palette: faded grey cloth, indigo shadows, single faint cherry-blossom pink edge on the bokken tip. Facing right. Hard pixel edges, no antialiasing.",
    "public/avatars/samurai/female_t1.png": "64x64 pixel art sprite, SNES RPG character style. A female samurai warrior standing upright with light armor — one indigo shoulder plate, a proper katana drawn at ready. Hair flowing beneath a simple headband. Wearing dark hakama and tabi boots. Confident stance. Color palette: dark indigo armor accent, grey-blue hakama, cherry-blossom pink glow along the katana blade edge. Facing right. Hard pixel edges, no antialiasing.",
    "public/avatars/samurai/female_t2.png": "64x64 pixel art sprite, SNES RPG character style. A female daimyo war lord in full samurai armor — kabuto helmet with small horns, chest plate, arm guards, wide power stance. Dual-wielding katana and wakizashi. Imposing and wide silhouette. Color palette: deep indigo armor plates with gold trim, cherry-blossom pink energy crackling between the two blades. Facing right. Hard pixel edges, no antialiasing.",
    "public/avatars/samurai/female_t3.png": "64x64 pixel art sprite, SNES RPG character style. A female shogun commander in ornate battle armor with a war banner rising behind her. Horned kabuto with face mask, elaborate shoulder guards, one hand raised commanding. The banner has a cherry blossom crest. Color palette: black and indigo lacquered armor with gold accents, cherry-blossom pink banner crest and weapon glow. Facing right. Hard pixel edges, no antialiasing.",
    "public/avatars/samurai/female_t4.png": "64x64 pixel art sprite, SNES RPG character style. A transcendent female legendary warrior — mythical armor that seems alive, wreathed in cherry-blossom energy that radiates outward. Eyes glow pink, spirit petals orbit the body, hair flows upward with energy. Katana is pure energy. The figure is mid-action, radiating power that fills the frame. Color palette: indigo-black divine armor, overwhelming cherry-blossom pink aura, spirit petals, glowing eyes. Facing right. Hard pixel edges, no antialiasing.",
}


def generate_sprite(prompt: str, output_path: str):
    """Generate a single sprite via Gemini and save it."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    full_prompt = prompt + SUFFIX

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=full_prompt,
            config=types.GenerateContentConfig(
                response_modalities=["image", "text"],
            ),
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data:
                with open(output_path, "wb") as f:
                    f.write(part.inline_data.data)
                print(f"  ✓ Generated: {output_path}")
                return True
        print(f"  ✗ No image in response: {output_path}")
        return False
    except Exception as e:
        print(f"  ✗ Error: {output_path} — {e}")
        return False


def remove_green_background(path: str):
    """Replace green-dominant pixels with transparency."""
    img = Image.open(path).convert("RGBA")
    data = list(img.getdata())
    new_data = []
    for r, g, b, a in data:
        # Green channel dominant and clearly greener than red/blue
        if g > 150 and g > r and g > b and (g - r) > 30:
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append((r, g, b, a))
    img.putdata(new_data)
    # Resize to 64x64 if not already
    if img.width != 64 or img.height != 64:
        img = img.resize((64, 64), Image.NEAREST)
    img.save(path)


def main():
    if not os.environ.get("GEMINI_API_KEY"):
        print("Error: Set GEMINI_API_KEY environment variable")
        return

    sprites = {**SAMURAI_AVATARS}
    total = len(sprites)
    print(f"Generating {total} sprites...\n")

    for i, (path, prompt) in enumerate(sprites.items(), 1):
        print(f"[{i}/{total}] {os.path.basename(path)}")
        if generate_sprite(prompt, path):
            remove_green_background(path)
            print(f"  ✓ Green removed + resized to 64x64")
        # Rate limit: 1 request per 2 seconds
        if i < total:
            time.sleep(2)

    print(f"\nDone! {total} sprites generated.")


if __name__ == "__main__":
    main()
