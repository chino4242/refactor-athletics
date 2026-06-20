#!/usr/bin/env python3
"""
Batch generate enemy sprites using Google Gemini API.
Usage: python3 scripts/generate-sprites.py --theme dragon --api-key YOUR_KEY
       or set GEMINI_API_KEY env var

Requires: pip install google-genai Pillow
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

def load_prompts(theme: str) -> list[dict]:
    """Parse prompts from the markdown file."""
    filename_map = {
        'samurai': 'docs/SAMURAI_ENEMY_PROMPTS.md',
        'dragon': 'docs/DRACONIC_ENEMY_PROMPTS.md',
    }
    filepath = Path(filename_map.get(theme, f'docs/{theme.upper()}_ENEMY_PROMPTS.md'))
    if not filepath.exists():
        print(f"Error: {filepath} not found")
        sys.exit(1)

    content = filepath.read_text()
    prompts = []

    # Parse exercise sections
    exercises = [
        'back_squat', 'deadlift', 'bench_press', 'pull_up', 'overhead_press',
        'run_1_mile', 'plank', 'push_ups', 'run_400m', 'dead_hang', 'barbell_row', 'run_5k'
    ]

    # Extract code blocks in order
    code_blocks = re.findall(r'```\n(.*?)\n```', content, re.DOTALL)

    for i, block in enumerate(code_blocks):
        exercise_idx = i // 3
        tier = i % 3
        if exercise_idx < len(exercises):
            prompts.append({
                'exercise': exercises[exercise_idx],
                'tier': tier,
                'prompt': block.strip(),
                'filename': f'{exercises[exercise_idx]}_t{tier}.png'
            })

    return prompts


def generate_image(prompt: str, api_key: str) -> bytes | None:
    """Generate an image using Gemini API."""
    try:
        from google import genai
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model='gemini-2.0-flash-exp',
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_modalities=['image'],
            )
        )

        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    return part.inline_data.data
        return None
    except Exception as e:
        print(f"  Error: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description='Batch generate enemy sprites')
    parser.add_argument('--theme', required=True, help='Theme name (samurai, dragon, viking, etc.)')
    parser.add_argument('--api-key', default=os.environ.get('GEMINI_API_KEY'), help='Gemini API key')
    parser.add_argument('--output', default=None, help='Output directory (default: public/enemies/{theme})')
    parser.add_argument('--skip-existing', action='store_true', help='Skip files that already exist')
    parser.add_argument('--start-from', type=int, default=0, help='Start from prompt index N (for resuming)')
    args = parser.parse_args()

    if not args.api_key:
        print("Error: No API key. Set GEMINI_API_KEY or use --api-key")
        sys.exit(1)

    output_dir = Path(args.output or f'public/enemies/{args.theme}')
    output_dir.mkdir(parents=True, exist_ok=True)

    prompts = load_prompts(args.theme)
    print(f"Loaded {len(prompts)} prompts for theme '{args.theme}'")
    print(f"Output: {output_dir}")
    print()

    generated = 0
    skipped = 0

    for i, p in enumerate(prompts):
        if i < args.start_from:
            continue

        outpath = output_dir / p['filename']
        if args.skip_existing and outpath.exists():
            print(f"  [{i+1}/{len(prompts)}] SKIP (exists): {p['filename']}")
            skipped += 1
            continue

        print(f"  [{i+1}/{len(prompts)}] Generating: {p['filename']} ({p['exercise']} tier {p['tier']})...")

        image_data = generate_image(p['prompt'], args.api_key)
        if image_data:
            outpath.write_bytes(image_data)
            print(f"    ✓ Saved ({len(image_data)} bytes)")
            generated += 1
        else:
            print(f"    ✗ Failed")

        # Rate limit: ~15 requests/min for free tier
        time.sleep(4)

    print(f"\nDone! Generated: {generated}, Skipped: {skipped}, Failed: {len(prompts) - generated - skipped - args.start_from}")


if __name__ == '__main__':
    main()
