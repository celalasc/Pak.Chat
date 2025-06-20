import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, convertToCoreMessages, type Message } from 'ai';
import { getModelConfig, AIModel } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { isConvexId } from '@/lib/ids';
import { buildSystemPrompt } from '@/lib/systemPrompt';
import { CustomInstructions } from '@/frontend/stores/SettingsStore';


interface Attachment {
  id: Id<'attachments'>;
  messageId: Id<'messages'> | undefined;
  name: string;
  type: string;
  url: string | null;
}

type ChatMessage = Omit<Message, 'id'>;

/**
 * Next.js route execution timeout. Streaming long replies or handling
 * large (but still bounded) files can easily exceed one minute, поэтому
 * увеличиваем лимит до 5 минут.
 */
export const maxDuration = 300;

// Максимальный допустимый размер загружаемого вложения (30 МБ)
const MAX_ATTACHMENT_SIZE_BYTES = 30 * 1024 * 1024;
// Мультимодели спокойно справляются с текстом, JSON, CSV и т. д.
const EXTRA_TEXT_MIME_TYPES = new Set([
  'application/json',
  'application/xml',
  'application/csv',
  'application/x-yaml',
  'application/sql',
]);

export async function POST(req: NextRequest) {
  try {
    const { messages, model, apiKeys, threadId, userId, search } = await req.json();

    // Для нового чата threadId может быть пустым - это нормально
    // Проверяем только если есть сообщения, которые нужно сохранить в БД
    if (!threadId && messages.length > 1) {
      return NextResponse.json(
        { error: 'threadId required for existing conversations' },
        { status: 400 }
      );
    }

    const modelConfig = getModelConfig(model as AIModel);
    const apiKey = apiKeys[modelConfig.provider];
    const reasoningEffort = modelConfig.reasoningEffort;

    if (!apiKey) {
      return new NextResponse(JSON.stringify({ error: 'Missing API key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let aiModel;
    
    switch (modelConfig.provider) {
      case 'google':
        // Для Google моделей настраиваем Search Grounding согласно документации AI SDK
        if (search) {
          aiModel = createGoogleGenerativeAI({ apiKey })(modelConfig.modelId, {
            useSearchGrounding: true
          });
        } else {
          aiModel = createGoogleGenerativeAI({ apiKey })(modelConfig.modelId);
        }
        break;
      case 'openai':
        // Применяем reasoningEffort только для o1/o3/o4 моделей (моделей с reasoning)
        const openaiConfig: { reasoningEffort?: "low" | "medium" | "high" } = {};
        if (reasoningEffort && ['o4-mini', 'o3'].includes(model)) {
          openaiConfig.reasoningEffort = reasoningEffort;
        }
        aiModel = createOpenAI({ apiKey })(modelConfig.modelId, openaiConfig);
        break;
      case 'openrouter':
        aiModel = createOpenRouter({ apiKey })(modelConfig.modelId);
        break;
      case 'groq':
        /*
         * The Groq API is OpenAI-compatible, therefore we can reuse the
         * OpenAI provider from the AI SDK by specifying a custom baseURL.
         * See: https://console.groq.com/docs for details.
         */
        aiModel = createOpenAI({
          apiKey,
          baseURL: 'https://api.groq.com/openai/v1',
        })(modelConfig.modelId);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Unsupported model provider' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    // Получаем настройки пользователя для кастомных инструкций
    let userCustomInstructions: CustomInstructions | undefined;
    
    try {
      let userSettings = null;
      
      // Попробуем получить настройки через threadId
      if (threadId && isConvexId(threadId)) {
        userSettings = await fetchQuery(api.userSettings.getByThreadId, { threadId });
      }
      
      // Если не удалось через threadId, попробуем через userId
      if (!userSettings && userId) {
        userSettings = await fetchQuery(api.userSettings.getByFirebaseUid, { firebaseUid: userId });
      }
      
      if (userSettings) {
        userCustomInstructions = {
          name: userSettings.customInstructionsName || '',
          occupation: userSettings.customInstructionsOccupation || '',
          traits: userSettings.customInstructionsTraits || [],
          traitsText: userSettings.customInstructionsTraitsText || '',
          additionalInfo: userSettings.customInstructionsAdditionalInfo || '',
        };
      }
    } catch (e) {
      console.error('User settings fetch failed:', e);
    }

    let attachments: Attachment[] = [];
    if (threadId && isConvexId(threadId)) {
      try {
        attachments = await fetchQuery(api.attachments.byThread, { threadId });
      } catch (e) {
        console.error('Attachment fetch failed:', e);
      }
    }

    const processedMessages: ChatMessage[] = await Promise.all(
      messages.map(async (message: { id: string; role: string; content: string }) => {
        // Получаем вложения для сообщения
        const messageAttachments = attachments.filter((a) => {
          // Если вложение привязано к конкретному сообщению
          if (a.messageId === message.id) return true;
          
          // Для новых вложений (messageId может быть null или undefined)
          // привязываем к последнему сообщению пользователя
          if (!a.messageId && message.role === 'user') {
            // Проверяем, что это последнее сообщение пользователя
            const userMessages = messages.filter((m: { id: string; role: string; content: string }) => m.role === 'user');
            const lastUserMessage = userMessages[userMessages.length - 1];
            return message.id === lastUserMessage.id;
          }
          
          return false;
        });

        if (messageAttachments.length === 0) {
          return { role: message.role, content: message.content };
        }

        const content: ({ type: 'text'; text: string } | { type: 'image'; image: string })[] = [];

        if (message.content && message.content.trim()) {
          content.push({ type: 'text', text: message.content });
        }

        for (const attachment of messageAttachments) {
          if (!attachment.url) continue;


          try {
            const res = await fetch(attachment.url);
            if (!res.ok) throw new Error(`Failed to fetch attachment ${attachment.url}`);

            const arrayBuffer = await res.arrayBuffer();
            const sizeBytes = arrayBuffer.byteLength;

            if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
              content.push({
                type: 'text',
                text: `Attachment ${attachment.name} skipped – file size ${(sizeBytes / (1024 * 1024)).toFixed(1)} MB exceeds 30 MB limit.`,
              });
              console.warn('Attachment too large – skipped:', attachment.name);
              continue;
            }

            // Convert buffer once for downstream usage
            const buf = Buffer.from(arrayBuffer);

            const mime = attachment.type;

            // --- PDF ------------------------------------------------------
            if (mime === 'application/pdf') {
              try {
                // Для Google провайдера передаем PDF напрямую как file data
                if (modelConfig.provider === 'google') {
                  // Gemini поддерживает нативную обработку PDF
                  const base64 = buf.toString('base64');
                  content.push({ 
                    type: 'image', 
                    image: `data:${mime};base64,${base64}` 
                  });
                } else {
                  // Для других провайдеров используем pdf-parse для извлечения текста
                  const pdfModule = await import('pdf-parse');
                  const pdf = pdfModule.default as (data: Buffer) => Promise<{ text: string }>;
                  const data = await pdf(buf);
                  content.push({ type: 'text', text: `PDF ${attachment.name}:\n${data.text}` });
                }
              } catch (err) {
                console.error('PDF parse failed:', err);
                content.push({ type: 'text', text: `Unable to parse PDF ${attachment.name}.` });
              }
              continue;
            }

            // --- Plain-text & structured text ----------------------------
            if (mime.startsWith('text/') || EXTRA_TEXT_MIME_TYPES.has(mime)) {
              const text = buf.toString('utf-8');
              content.push({ type: 'text', text: `${attachment.name}:\n${text}` });
              continue;
            }

            // --- Images ---------------------------------------------------
            if (mime.startsWith('image/')) {
              if (modelConfig.provider === 'google') {
                content.push({ type: 'image', image: attachment.url });
              } else {
                const base64 = buf.toString('base64');
                content.push({ type: 'image', image: `data:${mime};base64,${base64}` });
              }
              continue;
            }

            // --- Other binaries ------------------------------------------
            const base64 = buf.toString('base64');
            content.push({
              type: 'text',
              text: `Binary file ${attachment.name} (type ${mime}, ${(sizeBytes / 1024).toFixed(0)} KB) encoded in base64 below:\n${base64}`,
            });
          } catch (err) {
            console.error('Attachment processing failed:', err);
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
      // Для Google моделей useSearchGrounding уже установлен при создании модели,
      // поэтому дополнительные tools не передаём.
      onError: (e: unknown) => {
        console.error('AI SDK streamText Error:', e);
      },
      system: buildSystemPrompt(userCustomInstructions),
      abortSignal: req.signal,
        });

    return result.toDataStreamResponse({
      sendReasoning: true,
      getErrorMessage: (error: unknown) => (error as { message: string }).message,
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}