import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  const { text } = await request.json();
  if (!text) return NextResponse.json({ foods: [] });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: `Estimate the macros for this meal. Return ONLY a JSON array of food items, each with: name, grams (estimated weight in grams for the portion described), protein (g), carbs (g), fat (g), calories. Use typical serving sizes and estimate grams accordingly.

Meal: "${text}"

Return format: [{"name":"...","grams":0,"protein":0,"carbs":0,"fat":0,"calories":0}]` }],
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
      servingSize: item.grams ? `${item.grams}g` : '100g',
      per100g: {
        calories: Math.round((item.calories || 0) / ((item.grams || 100) / 100)),
        protein: Math.round((item.protein || 0) / ((item.grams || 100) / 100) * 10) / 10,
        carbs: Math.round((item.carbs || 0) / ((item.grams || 100) / 100) * 10) / 10,
        fat: Math.round((item.fat || 0) / ((item.grams || 100) / 100) * 10) / 10,
      },
    }));
    return NextResponse.json({ foods });
  } catch {
    return NextResponse.json({ foods: [] });
  }
}
