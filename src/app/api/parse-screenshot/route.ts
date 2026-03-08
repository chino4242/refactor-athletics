import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('Screenshot upload request received');
    console.log('API Key present:', !!process.env.ANTHROPIC_API_KEY);
    console.log('API Key length:', process.env.ANTHROPIC_API_KEY?.length);
    
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const type = formData.get('type') as string;

    console.log('File:', file?.name, 'Type:', type);

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

    console.log('Image converted to base64, size:', base64Image.length);

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
}`
    };

    console.log('Calling Claude API...');

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
              text: prompts[type as keyof typeof prompts] || prompts.workout,
            },
          ],
        },
      ],
    });

    console.log('Claude response received');

    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '';
    console.log('Extracted text:', text);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    console.log('Parsed data:', data);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error parsing screenshot:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to parse screenshot' 
    }, { status: 500 });
  }
}
