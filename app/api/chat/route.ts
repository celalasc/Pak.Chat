import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import { getModelConfig, AIModel } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

interface Attachment {
  id: Id<'attachments'>;
  messageId: Id<'messages'> | undefined;
  name: string;
  type: string;
  url: string | null;
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { messages, model, apiKeys, threadId } = await req.json();

    const modelConfig = getModelConfig(model as AIModel);
    
    const apiKey = apiKeys[modelConfig.provider];
    
    if (!apiKey) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing API key' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let aiModel;
    switch (modelConfig.provider) {
      case 'google':
        const google = createGoogleGenerativeAI({ apiKey });
        aiModel = google(modelConfig.modelId);
        break;

      case 'openai':
        const openai = createOpenAI({ apiKey });
        aiModel = openai(modelConfig.modelId);
        break;

      case 'openrouter':
        const openrouter = createOpenRouter({ apiKey });
        aiModel = openrouter(modelConfig.modelId);
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Unsupported model provider' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
    }

    // Получаем вложения из базы данных, если есть threadId
    let attachments: Attachment[] = [];
    if (threadId) {
      try {
        attachments = await fetchQuery(api.attachments.byThread, { threadId });
        // Attachments fetched successfully
      } catch {
        // Attachment fetch failed
      }
    }

    // Преобразуем сообщения для поддержки изображений
    const processedMessages = messages.map((message: { id: string; role: string; content: string }) => {
      const messageId = message.id;
      
      // Находим вложения для этого сообщения
      const messageAttachments = attachments.filter(
        a => a.messageId === messageId && a.url
      );
      
      
      if (messageAttachments.length === 0) {
        return {
          role: message.role,
          content: message.content,
        };
      }

      // Если есть вложения, создаем multimodal content
      const content = [];
      
      // Добавляем текст сообщения
      if (message.content && message.content.trim()) {
        content.push({
          type: 'text',
          text: message.content,
        });
      }

      // Добавляем изображения
      messageAttachments.forEach((attachment) => {
        if (attachment.type.startsWith('image/')) {
          content.push({
            type: 'image',
            image: attachment.url!,
          });
        }
      });

      // Если есть изображения, но нет текста, добавляем пустой текст
      if (content.length > 0 && !content.some(c => c.type === 'text')) {
        content.unshift({
          type: 'text',
          text: '',
        });
      }

      const result = {
        role: message.role,
        content: content.length > 0 ? content : message.content,
      };
      
      
      return result;
    });

    // Determine how to chunk the output based on network speed (unused for now)
    // const netType = (net ?? '4g') as string;
    // const chunking: 'line' | 'word' =
    //   netType.includes('2g') || netType.includes('3g') ? 'line' : 'word';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      model: aiModel,
      messages: processedMessages,
      onError: () => {
        /* Intentionally left blank to suppress logging */
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
      
      When analyzing images, be descriptive and helpful. Explain what you see in detail and answer any questions about the image content.
      `,
      abortSignal: req.signal,
    };
    const result = streamText(options);

    return result.toDataStreamResponse({
      sendReasoning: true,
      getErrorMessage: (error) => {
        return (error as { message: string }).message;
      },
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
