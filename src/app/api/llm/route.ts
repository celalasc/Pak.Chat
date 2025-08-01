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

// Use Node.js runtime for development compatibility
// Edge runtime is enabled in production via deployment configuration
export const runtime = 'nodejs';

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
    const { messages, model, apiKeys, threadId, userId, search, imageGeneration, customMode, projectId } = await req.json();
    
    // Debug log for image generation
    if (imageGeneration?.enabled) {
      // Image generation request received
    }

    // DEBUG: Detailed logging for threadId debugging
  console.log('🔍 API /llm - Request received:', {
    threadId: threadId,
    threadIdType: typeof threadId,
    threadIdLength: threadId?.length,
    messagesCount: messages.length,
    timestamp: new Date().toISOString()
  });
  
  // Для нового чата threadId может быть пустым - это нормально
  // Но если есть больше одного сообщения пользователя, threadId обязателен
  const userMessagesCount = messages.filter(m => m.role === 'user').length;
  
  // DEBUG: Log user messages analysis
  console.log('🔍 API /llm - User messages analysis:', {
    userMessagesCount: userMessagesCount,
    allMessages: messages.map(m => ({ role: m.role, id: m.id, contentLength: m.content?.length || 0 })),
    shouldRequireThreadId: userMessagesCount > 1,
    hasThreadId: !!threadId
  });
  
  if (!threadId && userMessagesCount > 1) {
    console.error('❌ API /llm - threadId validation failed:', {
      threadId: threadId,
      userMessagesCount: userMessagesCount,
      error: 'threadId required for existing conversations'
    });
    return NextResponse.json(
      { error: 'threadId required for existing conversations' },
      { status: 400 }
    );
  }
  
  console.log('✅ API /llm - threadId validation passed');

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

    // Оптимизация: для нового чата пропускаем все БД запросы
    const isNewChat = !threadId || !isConvexId(threadId);
    const isFirstMessage = messages.length === 1 && messages[0].role === 'user';
    
    let userCustomInstructions: CustomInstructions | undefined;
    let attachments: Attachment[] = [];
    
    // Загружаем настройки только если не первое сообщение или есть userId
    if (!isFirstMessage || userId) {
      const settingsPromise = (async () => {
        try {
          let userSettings = null;
          
          if (isNewChat && userId) {
            userSettings = await fetchQuery(api.userSettings.getByFirebaseUid, { firebaseUid: userId });
          } else if (threadId && isConvexId(threadId) && userId) {
            const [byThread, byUser] = await Promise.allSettled([
              fetchQuery(api.userSettings.getByThreadId, { threadId }),
              fetchQuery(api.userSettings.getByFirebaseUid, { firebaseUid: userId })
            ]);
            
            userSettings = byThread.status === 'fulfilled' && byThread.value 
              ? byThread.value 
              : (byUser.status === 'fulfilled' ? byUser.value : null);
          } else if (threadId && isConvexId(threadId)) {
            userSettings = await fetchQuery(api.userSettings.getByThreadId, { threadId });
          } else if (userId) {
            userSettings = await fetchQuery(api.userSettings.getByFirebaseUid, { firebaseUid: userId });
          }
          
          if (userSettings) {
            return {
              name: userSettings.customInstructionsName || '',
              occupation: userSettings.customInstructionsOccupation || '',
              traits: userSettings.customInstructionsTraits || [],
              traitsText: userSettings.customInstructionsTraitsText || '',
              additionalInfo: userSettings.customInstructionsAdditionalInfo || '',
            } as CustomInstructions;
          }
        } catch (e) {
          console.error('User settings fetch failed:', e);
        }
        return undefined;
      })();
      
      // Загружаем вложения только для существующих чатов
      const attachmentsPromise = (async () => {
        if (threadId && isConvexId(threadId) && !isFirstMessage) {
          try {
            return await fetchQuery(api.attachments.byThread, { threadId });
          } catch (e) {
            console.error('Attachment fetch failed:', e);
          }
        }
        return [] as Attachment[];
      })();
      
      [userCustomInstructions, attachments] = await Promise.all([settingsPromise, attachmentsPromise]);
    }

    // Fetch project context if projectId is provided
    let projectContext = "";
    if (projectId && isConvexId(projectId)) {
      try {
        const [project, projectFiles] = await Promise.all([
          fetchQuery(api.projects.get, { projectId }),
          fetchQuery(api.projectFiles.listForAPI, { 
            projectId, 
            paginationOpts: { numItems: 100, cursor: null } 
          })
        ]);

        if (project) {
          projectContext += `\n\n--- Project Context ---`;
          projectContext += `\nProject: ${project.name}`;
          
          if (project.customInstructions) {
            projectContext += `\n\nProject Instructions: ${project.customInstructions}`;
          }

          if (projectFiles?.page && projectFiles.page.length > 0) {
            projectContext += `\n\nProject Files:`;
            projectFiles.page.forEach((file) => {
              projectContext += `\n\n--- File: ${file.name} (${file.fileType}) ---`;
              projectContext += `\n${file.content}`;
              projectContext += `\n--- End of ${file.name} ---`;
            });
          }
          
          projectContext += `\n--- End Project Context ---\n\n`;
        }
      } catch (error) {
        console.error('Failed to fetch project context:', error);
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

    // Handle image generation if enabled - ALWAYS use OpenAI regardless of selected model
    if (imageGeneration?.enabled) {
      const openAIApiKey = apiKeys.openai;
      
      if (!openAIApiKey) {
        return new NextResponse(
          JSON.stringify({ error: 'OpenAI API key required for image generation' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Get the user's prompt from the last message
      const lastMessage = messages[messages.length - 1];
      const prompt = lastMessage?.content || '';

      if (!prompt.trim()) {
        return new NextResponse(
          JSON.stringify({ error: 'Prompt required for image generation' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      try {
        // Resolve base URL dynamically so internal calls work in any deployment
        // environment (Vercel, Railway, local, etc.)
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_BASE_URL
            ? process.env.NEXT_PUBLIC_BASE_URL
            : process.env.NODE_ENV === 'development'
              ? 'http://localhost:3000'
              : req.nextUrl.origin;

        // Generate image using OpenAI API - always use OpenAI regardless of selected model
        const response = await fetch(`${baseUrl}/api/image-generation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            apiKeys,
            userId,
            size: imageGeneration.params.size === 'auto' ? '1024x1024' : imageGeneration.params.size,
            quality: imageGeneration.params.quality === 'auto' ? 'auto' : 
                    imageGeneration.params.quality === 'standard' ? 'medium' :
                    imageGeneration.params.quality === 'low' ? 'low' :
                    imageGeneration.params.quality === 'high' ? 'high' : 'medium',
            count: imageGeneration.params.count,
            format: imageGeneration.params.format || 'jpeg',
            compression: imageGeneration.params.compression || 80,
          }),
        });

        if (!response.ok) {
          let errorMessage = 'Image generation failed';
          try {
            const errorText = await response.text();
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            // If parsing fails, use generic error message
            console.error('Failed to parse error response:', parseError);
          }
          throw new Error(errorMessage);
        }

        const imageData = await response.json();

        // Create a special response format for image generation
        const imageResponse = {
          type: 'image_generation',
          prompt: prompt,
          images: imageData.images,
          params: imageData.settings, // Use actual settings from API response instead of input params
        };

        return new NextResponse(JSON.stringify(imageResponse), {
          headers: { 'Content-Type': 'application/json' },
        });

      } catch (error) {
        console.error('Image generation error:', error);
        return new NextResponse(
          JSON.stringify({ 
            error: 'Image generation failed', 
            details: error instanceof Error ? error.message : 'Unknown error' 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get custom mode prompt if provided
    let customModePrompt: string | undefined;
    if (customMode && customMode.id !== 'default') {
      customModePrompt = customMode.systemPrompt;
    }

    const result = await streamText({
      model: aiModel,
      messages: coreMessages,
      // Для Google моделей useSearchGrounding уже установлен при создании модели,
      // поэтому дополнительные tools не передаём.
      onError: (e: unknown) => {
        console.error('AI SDK streamText Error:', e);
      },
      system: buildSystemPrompt(userCustomInstructions, customModePrompt, projectContext),
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