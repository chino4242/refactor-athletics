import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  const { text } = await request.json();
  if (!text) return NextResponse.json({ foods: [] });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: `Estimate the macros for this meal. Return ONLY a JSON array of food items, each with: name, protein (g), carbs (g), fat (g), calories. Use typical serving sizes. Be concise.

Meal: "${text}"

Return format: [{"name":"...","protein":0,"carbs":0,"fat":0,"calories":0}]` }],
  });

  try {
    const content = (response.content[0] as any).text;
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ foods: [] });
    const parsed = JSON.parse(match[0]);
    const foods = parsed.map((item: any) => ({
      id: `ai_${item.name?.replace(/\s+/g, '_').toLowerCase()}`,
      name: item.name,
      source: 'usda' as const,
      servingSize: '1 serving',
      per100g: { calories: item.calories || 0, protein: item.protein || 0, carbs: item.carbs || 0, fat: item.fat || 0 },
    }));
    return NextResponse.json({ foods });
  } catch {
    return NextResponse.json({ foods: [] });
  }
}
