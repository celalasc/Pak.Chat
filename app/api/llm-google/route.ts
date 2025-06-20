import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { isConvexId } from '@/lib/ids';
import { getModelConfig, AIModel } from '@/lib/models';
import { buildSystemPrompt } from '@/lib/systemPrompt';
import { CustomInstructions } from '@/frontend/stores/SettingsStore';
interface Attachment {
  id: Id<'attachments'>;
  messageId: Id<'messages'> | undefined;
  name: string;
  type: string;
  url: string | null;
}

export const maxDuration = 300;

const MAX_ATTACHMENT_SIZE_BYTES = 30 * 1024 * 1024;
const EXTRA_TEXT_MIME_TYPES = new Set([
  'application/json',
  'application/xml',
  'application/csv',
  'application/x-yaml',
  'application/sql',
]);

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      model,
      apiKeys,
      threadId,
      userId,
      search,
      attachments: requestAttachments,
    } = await req.json();

    if (!threadId && messages.length > 1) {
      return NextResponse.json(
        { error: 'threadId required for existing conversations' },
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

    if (modelConfig.provider !== 'google') {
      return new NextResponse(JSON.stringify({ error: 'This endpoint only supports Google models' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const genAI = new GoogleGenAI({ apiKey });
    
    // Конфигурация генерации
    const generationConfig = {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: 'text/plain',
    };

    // Добавляем thinking config для моделей которые его поддерживают
    const thinkingConfig = modelConfig.modelId.includes('flash') ? {
      thinkingConfig: {
        thinkingBudget: -1, // Неограниченный thinking budget
      }
    } : {};

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
        
        console.log('Loaded custom instructions for user (Google API):', { userId, threadId, userCustomInstructions });
      } else {
        console.log('No custom instructions found for user (Google API):', { userId, threadId });
      }
    } catch (e) {
      console.error('User settings fetch failed:', e);
    }

    // Обрабатываем вложения и историю
    let attachments: Attachment[] = [];
    if (threadId && isConvexId(threadId)) {
      try {
        attachments = await fetchQuery(api.attachments.byThread, { threadId });
      } catch (e) {
        console.error('Attachment fetch failed:', e);
      }
    }

    // Include attachments passed directly in the request to avoid race conditions
    if (Array.isArray(requestAttachments)) {
      const map = new Map(attachments.map((a) => [a.id, a]));
      for (const att of requestAttachments as Attachment[]) {
        map.set(att.id, att);
      }
      attachments = Array.from(map.values());
    }

    // Преобразуем сообщения в формат Google AI
    const contents = [];

    for (const message of messages) {
      const parts = [];

      // Добавляем текст сообщения
      if (message.content && message.content.trim()) {
        parts.push({ text: message.content });
      }

      // Получаем вложения для сообщения
      const messageAttachments = attachments.filter((a) => {
        if (a.messageId === message.id) return true;
        
        if (!a.messageId && message.role === 'user') {
          const userMessages = messages.filter((m: { id: string; role: string; content: string }) => m.role === 'user');
          const lastUserMessage = userMessages[userMessages.length - 1];
          return message.id === lastUserMessage.id;
        }
        
        return false;
      });

      // Обрабатываем вложения
      for (const attachment of messageAttachments) {
        try {
          // Always resolve the original file URL to ensure Gemini receives the full data
          const fileUrl = await fetchQuery(api.attachments.getUrl, { attachmentId: attachment.id });
          if (!fileUrl) continue;

          const res = await fetch(fileUrl);
          if (!res.ok) throw new Error(`Failed to fetch attachment ${fileUrl}`);

          const arrayBuffer = await res.arrayBuffer();
          const sizeBytes = arrayBuffer.byteLength;

          if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
            parts.push({
              text: `Attachment ${attachment.name} skipped – file size ${(sizeBytes / (1024 * 1024)).toFixed(1)} MB exceeds 30 MB limit.`
            });
            continue;
          }

          const buf = Buffer.from(arrayBuffer);
          const mime = attachment.type;

          // PDF и изображения передаем как inline data
          if (mime === 'application/pdf' || mime.startsWith('image/')) {
            const base64 = buf.toString('base64');
            parts.push({
              inlineData: {
                mimeType: mime,
                data: base64
              }
            });
          }
          // Текстовые файлы
          else if (mime.startsWith('text/') || EXTRA_TEXT_MIME_TYPES.has(mime)) {
            const text = buf.toString('utf-8');
            parts.push({ text: `${attachment.name}:\n${text}` });
          }
          // Другие файлы
          else {
            const base64 = buf.toString('base64');
            parts.push({
              text: `Binary file ${attachment.name} (type ${mime}, ${(sizeBytes / 1024).toFixed(0)} KB) encoded in base64 below:\n${base64}`
            });
          }
        } catch (err) {
          console.error('Attachment processing failed:', err);
        }
      }

      // Добавляем сообщение в историю
      if (parts.length > 0 || message.content) {
        // Преобразуем роли для Google AI API: assistant -> model
        const googleRole = message.role === 'assistant' ? 'model' : message.role;
        contents.push({
          role: googleRole,
          parts: parts.length > 0 ? parts : [{ text: message.content }]
        });
      }
    }

    if (contents.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'No message content provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Конфигурация для генерации с поддержкой thinking и search
    const config = {
      model: modelConfig.modelId,
      config: {
        ...generationConfig,
        ...thinkingConfig,
        // Включаем search grounding если запрошено
        ...(search && {
          tools: [{
            googleSearchRetrieval: {
              dynamicRetrievalConfig: {
                mode: "MODE_DYNAMIC",
                dynamicThreshold: 0.3,
              }
            }
          }]
        })
      },
      contents,
      systemInstruction: {
        parts: [{
          text: buildSystemPrompt(userCustomInstructions)
        }]
      }
    };

    // Используем новый API для стриминга
    const response = await genAI.models.generateContentStream(config);

    // Создаем совместимый с AI SDK поток данных
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let reasoning = '';
          let isThinking = false;
          
          // Начинаем стриминг
          controller.enqueue(encoder.encode('0:""\n'));
          
          for await (const chunk of response) {
            const text = chunk.text;
            
            if (!text) continue;
            
            // Обрабатываем thinking блоки если модель их поддерживает
            if (text.includes('<thinking>')) {
              isThinking = true;
              reasoning += text;
              continue;
            }
            
            if (isThinking && text.includes('</thinking>')) {
              isThinking = false;
              reasoning += text;
              
              // Отправляем reasoning через специальный формат AI SDK
              const reasoningData = JSON.stringify({ reasoning });
              controller.enqueue(encoder.encode(`e:${JSON.stringify(reasoningData)}\n`));
              reasoning = '';
              continue;
            }
            
            if (isThinking) {
              reasoning += text;
              continue;
            }
            
            // Отправляем текст в формате AI SDK
            const textData = JSON.stringify(text);
            controller.enqueue(encoder.encode(`0:${textData}\n`));
          }
          
          // Завершаем стрим в формате AI SDK
          controller.enqueue(encoder.encode('d:{"finishReason":"stop"}\n'));
          
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          // Отправляем ошибку в формате AI SDK
          const errorData = JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          controller.enqueue(encoder.encode(`3:"${errorData}"\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Vercel-AI-Data-Stream': 'true',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Google LLM API Error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 