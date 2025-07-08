import { GoogleGenAI } from '@google/genai';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

// Use Node.js runtime for development compatibility
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const headersList = await headers();
  const googleApiKey = headersList.get('X-Google-API-Key');

  if (!googleApiKey) {
    return NextResponse.json(
      {
        error: 'Google API key is required to enable chat title generation.',
      },
      { status: 400 }
    );
  }

  const genAI = new GoogleGenAI({ apiKey: googleApiKey });

  const { prompt, isTitle, messageId, threadId } = await req.json();

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-lite-preview-06-17',
      contents: [
        {
          role: 'user',
          parts: [{
            text: `You are a title generator. Follow these rules:
- you will generate a short title based on the first message a user begins a conversation with
- ensure it is not more than 80 characters long
- the title should be a summary of the user's message
- you should NOT answer the user's message, you should only generate a summary/title
- do not use quotes or colons

User message: ${prompt}`
          }]
        }
      ],
      config: {
        temperature: 0.7,
        maxOutputTokens: 60,
      }
    });

    const title = response.text;

    return NextResponse.json({ title, isTitle, messageId, threadId });
  } catch (error) {
    console.error('Title generation error:', error);
    // Fallback: use the first 80 characters of the prompt as the title so that
    // the client can continue functioning even if the LLM request fails.
    const fallbackTitle = (prompt as string)?.trim().slice(0, 80) || 'New chat';

    return NextResponse.json({
      title: fallbackTitle,
      isTitle,
      messageId,
      threadId,
      error: 'Failed to generate title – using fallback',
    });
  }
}
