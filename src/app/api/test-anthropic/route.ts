import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'API key not found',
        hasKey: false 
      });
    }

    const anthropic = new Anthropic({ apiKey });

    // Try a simple text-only request to test the key
    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'Say "API key works!"',
        },
      ],
    });

    return NextResponse.json({ 
      success: true,
      hasKey: true,
      keyLength: apiKey.length,
      response: response.content[0]
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      status: error.status,
      details: error
    }, { status: 500 });
  }
}
