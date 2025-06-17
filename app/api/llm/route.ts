import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, convertToCoreMessages, type Message } from 'ai';
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

    const messageIds = new Set(messages.map((m: { id: string }) => m.id));

    const processedMessages: ChatMessage[] = await Promise.all(
      messages.map(async (message: { id: string; role: string; content: string }) => {
        // Attachments may arrive slightly later than the message –
        // treat attachments that haven't been linked (messageId == null)
        // as belonging to the latest user message to avoid race conditions.
        const messageAttachments = attachments.filter((a) => {
          if (!a.url) return false;
          if (a.messageId === message.id) return true;
          // If attachment.messageId is null OR not part of this request (means server DB id),
          // attach it to the nearest preceding user message without other attachments.
          if (a.messageId == null || !messageIds.has(a.messageId as unknown as string)) {
            return message.role === 'user';
          }
          return false;
        });

        console.log('Processing message:', {
          messageId: message.id,
          messageRole: message.role,
          allAttachments: attachments.map(a => ({ id: a.id, messageId: a.messageId, name: a.name, type: a.type, hasUrl: !!a.url })),
          filteredAttachments: messageAttachments.map(a => ({ id: a.id, name: a.name, type: a.type }))
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

          console.log('Processing attachment:', {
            name: attachment.name,
            type: attachment.type,
            provider: modelConfig.provider,
          });

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
                // @ts-expect-error - pdf-parse has no type definitions
                const pdfModule = (await import('pdf-parse/lib/pdf-parse.js')) as unknown;
                const pdf = (pdfModule as { default?: (b: Buffer) => Promise<{ text: string }> }).default ?? (pdfModule as (b: Buffer) => Promise<{ text: string }>);
                const data = await pdf(buf);
                content.push({ type: 'text', text: `PDF ${attachment.name}:\n${data.text}` });
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

        console.log('Final processed message:', {
          messageId: message.id,
          contentItems: content.length,
          contentTypes: content.map(c => c.type),
          hasMultipleContent: content.length > 1
        });

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