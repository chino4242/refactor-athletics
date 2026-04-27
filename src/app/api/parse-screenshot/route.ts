import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const type = formData.get('type') as string;
    const subtype = formData.get('subtype') as string | null;


    if (!file) {
      console.error('No image provided');
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not set');
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('ANTHROPIC')));
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');


    // Determine media type
    const mediaType = file.type.includes('png') ? 'image/png' : 'image/jpeg';

    const prompts = {
      workout: `Extract workout data from this screenshot. Return ONLY valid JSON with this exact structure:
{
  "exercises": [
    {
      "name": "exercise name",
      "sets": [{"reps": 10, "weight": 185}]
    }
  ]
}`,
      nutrition: `Extract nutrition data from this screenshot. Return ONLY valid JSON with this exact structure:
{
  "protein": 150,
  "carbs": 200,
  "fat": 65,
  "water": 100
}`,
      habits: `Extract habit/activity data from this screenshot. Return ONLY valid JSON with this exact structure:
{
  "steps": 10000,
  "exercise_minutes": 30,
  "stand_hours": 12,
  "sleep": 7.5,
  "water": 100
}`,
      fitness: `Extract fitness/activity data from this screenshot. Look for calories burned (active calories + resting/basal calories = total), step count, and day strain or intensity score. Return ONLY valid JSON with this exact structure (use null for any values not found):
{
  "calories_burned": 2450,
  "steps": 10000,
  "day_strain": 14.2
}`,
      body_comp_tape: `Extract body tape measurements from this screenshot. Look for circumference measurements in inches for body parts. Return ONLY valid JSON with this exact structure (use null for any values not found):
{
  "weight": 185,
  "waist": 34,
  "arms": 15,
  "chest": 42,
  "legs": 24,
  "shoulders": 48
}`,
      body_comp_muscle: `Extract muscle mass data from this screenshot. Look for lean muscle mass in pounds (lbs) for each body segment. Return ONLY valid JSON with this exact structure (use null for any values not found):
{
  "weight": 185,
  "left_arm_muscle": 8.2,
  "right_arm_muscle": 8.4,
  "trunk_muscle": 62.5,
  "left_leg_muscle": 22.1,
  "right_leg_muscle": 22.3
}`
    };


    // Fetch few-shot examples for this type
    const promptKey = (type === 'body_comp' ? `body_comp_${subtype || 'tape'}` : type) as keyof typeof prompts;
    let basePrompt = prompts[promptKey] || prompts.workout;
    let fewShotBlock = '';

    try {
      const examplesRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/screenshot-examples?type=${promptKey}`);
      const { examples } = await examplesRes.json();
      if (examples?.length) {
        fewShotBlock = '\n\nHere are examples of previous screenshots and their correct extractions:\n' +
          examples.map((ex: any, i: number) =>
            `Example ${i + 1}:\nScreenshot description: ${ex.image_description}\nCorrect output: ${JSON.stringify(ex.corrected_json)}`
          ).join('\n\n');
      }
    } catch (e) {
      console.error('Failed to fetch few-shot examples:', e);
    }

    const fullPrompt = basePrompt + fewShotBlock +
      '\n\nAlso include an "image_description" field (1-2 sentences describing the screenshot layout and what app/device it came from) in your JSON response.';

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: fullPrompt,
            },
          ],
        },
      ],
    });


    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    const { image_description, ...data } = parsed;


    return NextResponse.json({ success: true, data, image_description: image_description || '' });
  } catch (error) {
    console.error('Error parsing screenshot:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to parse screenshot' 
    }, { status: 500 });
  }
}
