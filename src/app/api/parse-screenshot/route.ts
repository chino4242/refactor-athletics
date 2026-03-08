import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const type = formData.get('type') as string; // 'workout' | 'nutrition' | 'habits'

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
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
  "sleep": 7.5,
  "water": 100
}`
    };

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
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
              text: prompts[type as keyof typeof prompts] || prompts.workout,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error parsing screenshot:', error);
    return NextResponse.json({ error: 'Failed to parse screenshot' }, { status: 500 });
  }
}
