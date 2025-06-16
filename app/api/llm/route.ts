import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, convertToCoreMessages, type Message } from 'ai';
import { getModelConfig, AIModel } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

/**
 * Download a remote file and return it as a data URL for models that
 * require inline file contents.
 */
async function urlToDataUrl(url: string): Promise<{ dataUrl: string; type: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from URL: ${url}`);
  }
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const dataUrl = `data:${blob.type};base64,${base64}`;
  return { dataUrl, type: blob.type };
}

interface Attachment {
  id: Id<'attachments'>;
  messageId: Id<'messages'> | undefined;
  name: string;
  type: string;
  url: string | null;
}

type ChatMessage = Omit<Message, 'id'>;


export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { messages, model, apiKeys, threadId } = await req.json();

    if (!threadId) {
      return NextResponse.json(
        { error: 'threadId required' },
        { status: 400 }
      );
    }

    const modelConfig = getModelConfig(model as AIModel);
    const apiKey = apiKeys[modelConfig.provider];

    if (!apiKey) {
      return new NextResponse(JSON.stringify({ error: 'Missing API key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let aiModel;
    switch (modelConfig.provider) {
      case 'google':
        aiModel = createGoogleGenerativeAI({ apiKey })(modelConfig.modelId);
        break;
      case 'openai':
        aiModel = createOpenAI({ apiKey })(modelConfig.modelId);
        break;
      case 'openrouter':
        aiModel = createOpenRouter({ apiKey })(modelConfig.modelId);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Unsupported model provider' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    let attachments: Attachment[] = [];
    if (threadId) {
      try {
        attachments = await fetchQuery(api.attachments.byThread, { threadId });
      } catch (e) {
        console.error('Attachment fetch failed:', e);
      }
    }

    const processedMessages: ChatMessage[] = await Promise.all(
      messages.map(async (message: { id: string; role: string; content: string }) => {
        const messageAttachments = attachments.filter(
          (a) => a.messageId === message.id && a.url
        );

        if (messageAttachments.length === 0) {
          return { role: message.role, content: message.content };
        }

        const content: ({ type: 'text'; text: string } | { type: 'image'; image: string })[] = [];

        if (message.content && message.content.trim()) {
          content.push({ type: 'text', text: message.content });
        }

        for (const attachment of messageAttachments) {
          if (modelConfig.provider === 'google') {
            content.push({ type: 'image', image: attachment.url! });
          } else {
            try {
              const { dataUrl } = await urlToDataUrl(attachment.url!);
              content.push({ type: 'image', image: dataUrl });
            } catch (e) {
              console.error(`Failed to process attachment for ${modelConfig.provider}:`, e);
            }
          }
        }

        if (content.length > 0 && !content.some((c) => c.type === 'text')) {
          content.unshift({ type: 'text', text: 'Analyze the attached file(s).' });
        }

        return {
          role: message.role as 'user' | 'assistant',
          content: content.length > 1 ? content : message.content,
        };
      })
    );

    const coreMessages = convertToCoreMessages(processedMessages);

    const result = await streamText({
      model: aiModel,
      messages: coreMessages,
      onError: (e) => {
        console.error('AI SDK streamText Error:', e);
      },
      system: `
      You are Pak.Chat, an ai assistant that can answer questions and help with tasks.
      Be helpful and provide relevant information
      Be respectful and polite in all interactions.
      Be engaging and maintain a conversational tone.
      Always use LaTeX for mathematical expressions -
      Inline math must be wrapped in single dollar signs: $content$
      Display math must be wrapped in double dollar signs: $$content$$
      Display math should be placed on its own line, with nothing else on that line.
      Do not nest math delimiters or mix styles.
      Examples:
      - Inline: The equation $E = mc^2$ shows mass-energy equivalence.
      - Display: 
      $$\\frac{d}{dx}\\sin(x) = \\cos(x)$$

      When analyzing images or files, be descriptive and helpful. Explain what you see in detail and answer any questions about the content.
      `,
      abortSignal: req.signal,
    });

    return result.toDataStreamResponse({
      sendReasoning: true,
      getErrorMessage: (error) => (error as { message: string }).message,
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}