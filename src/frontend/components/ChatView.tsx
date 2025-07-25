"use client";

import { useChat } from '@ai-sdk/react';
// Chat message list component - lazy loaded
import { LazyMessages, LazyChatInput } from './lazy';
import ChatNavigationBars from './ChatNavigationBars';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import { useAttachmentsStore } from '@/frontend/stores/AttachmentsStore';
import { useChatStore } from '@/frontend/stores/ChatStore';
import { useCustomModesHelpers } from '@/frontend/stores/CustomModesStore';
import { cn } from '@/lib/utils';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import { Id, Doc } from '@/convex/_generated/dataModel';
import type { UIMessage } from 'ai';

import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { useQuoteShortcuts } from '@/frontend/hooks/useQuoteShortcuts';
import { loadDraft, saveDraft, clearDraft } from '@/frontend/lib/drafts';
import { saveLastChatId } from '@/frontend/lib/lastChat';
import { getModelConfig } from '@/lib/models';

interface ChatViewProps {
  threadId: string;
  thread: Doc<'threads'> | null | undefined;
  initialMessages: UIMessage[];
  showNavBars: boolean;
  onThreadCreated?: (newThreadId: string) => void;
  projectId?: Id<"projects">;
  project?: Doc<"projects">;
  customLayout?: boolean;
}

// Мемоизированный компонент ChatView
const ChatView = React.memo(function ChatView({ 
  threadId, 
  thread, 
  initialMessages, 
  showNavBars, 
  onThreadCreated,
  projectId,
  project,
  customLayout
}: ChatViewProps) {
  const { keys } = useAPIKeyStore();
  const { selectedModel, webSearchEnabled } = useModelStore();
  const clearQuote = useCallback(() => {
    useQuoteStore.getState().clearQuote();
  }, []);
  
  const clearAttachments = useCallback(() => {
    useAttachmentsStore.getState().clear();
  }, []);
  const { getSelectedMode } = useCustomModesHelpers();
  const { isMobile } = useIsMobile();
  
  // Включаем обработчик клавиши ESC для отмены цитирования
  useQuoteShortcuts();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentThreadId, setCurrentThreadId] = useState(threadId);
  
  // Состояние для отслеживания регенераций
  const [isRegenerating, setIsRegenerating] = useState(false);

  
  // Уникальный ключ для принудительного пересоздания useChat хука
  const [chatKey, setChatKey] = useState(() => `chat-${threadId || 'new'}-${Date.now()}`);

  // Мемоизируем конфигурацию модели
  const modelConfig = useMemo(() => {
    const config = getModelConfig(selectedModel);
    return config;
  }, [selectedModel]);

  const { isImageGenerationMode } = useChatStore(); // Get from store to track changes
  
  // Мемоизируем API endpoint
  const apiEndpoint = useMemo(() => {
    // Always use /api/llm for image generation, regardless of model
    if (isImageGenerationMode) {
      return '/api/llm'; // Force use of main LLM endpoint for image generation
    }
    // Use provider-specific endpoint for regular chat
    return modelConfig.provider === 'google' ? '/api/llm-google' : '/api/llm';
  }, [modelConfig.provider, isImageGenerationMode]);

  // Keep latest thread ID in a ref to avoid stale closures in callbacks
  const threadIdRef = useRef<string>(threadId);
  useEffect(() => {
    threadIdRef.current = currentThreadId;
  }, [currentThreadId]);

  const sendMessage = useMutation<typeof api.messages.send>(api.messages.send);
  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl);
  const saveAttachments = useMutation(api.attachments.save);

  // Map to hold temporary timestamps for messages that haven't been persisted yet
  const tempCreatedAtMap = useRef(new Map<string, number>());

  // Мемоизируем функцию прокрутки к сообщению
  const scrollToMessage = useCallback((messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    }
  }, []);

  // Обработчик создания нового треда
  const handleThreadCreated = useCallback((newThreadId: string) => {
    setCurrentThreadId(newThreadId);
    threadIdRef.current = newThreadId;
    // Уведомляем родительский компонент
    onThreadCreated?.(newThreadId);
  }, [onThreadCreated]);

  // Функция для принудительного сброса кэша при перегенерации
  const forceRegeneration = useCallback(() => {
    setIsRegenerating(true);
  }, []);

  // Мемоизируем тело запроса
  const requestBody = useMemo(
    () => ({
      model: selectedModel,
      apiKeys: keys,
      threadId: currentThreadId,
      search: webSearchEnabled,
      projectId: projectId,
    }),
    [selectedModel, keys, currentThreadId, webSearchEnabled, projectId]
  );

  // Мемоизируем функцию подготовки тела запроса
  const prepareRequestBody = useCallback(
    ({ messages, ...options }: { messages: UIMessage[]; [key: string]: any }) => {
      const currentThreadId = threadIdRef.current;
      const { isImageGenerationMode, imageGenerationParams } = useChatStore.getState();
      // Get current mode information
      const currentMode = getSelectedMode();
      const customModeData = currentMode.id !== 'default' ? {
        id: currentMode.id,
        systemPrompt: currentMode.systemPrompt
      } : undefined;
      
      const body = {
        messages: messages.map((m) => ({ ...m, id: m.id })),
        model: options.model || selectedModel, // Use model from options if provided, otherwise use selectedModel
        apiKeys: options.apiKeys || keys,
        threadId: options.threadId || currentThreadId,
        search: options.search !== undefined ? options.search : webSearchEnabled,
        imageGeneration: isImageGenerationMode ? {
          enabled: true,
          params: imageGenerationParams
        } : undefined,
        customMode: customModeData,
        projectId: options.projectId || projectId,
      };

      
      if (isImageGenerationMode) {
        // ChatView prepareRequestBody debug removed
      }

      return body;
    },
    [selectedModel, keys, webSearchEnabled, getSelectedMode, projectId]
  );

  // Add optimistic loading state for new chats
  const [isFirstMessagePending, setIsFirstMessagePending] = useState(false);

  const {
    messages,
    input,
    setInput: originalSetInput,
    setMessages: originalSetMessages,
    reload,
    stop: originalStop,
    append: originalAppend,
    status,
    error,
  } = useChat({
    api: apiEndpoint,
    id: chatKey,
    initialMessages,
    body: requestBody,
    experimental_prepareRequestBody: prepareRequestBody,
    experimental_throttle: 50, // Throttle updates to 50ms for smoother streaming

    fetch: async (url, init) => {
      // Check if this is an image generation request
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
      const isImageGeneration = body?.imageGeneration?.enabled;
      
      let loadingMessageId: string | null = null;
      
      // Create loading message for image generation
      if (isImageGeneration) {
        const lastMessage = body.messages[body.messages.length - 1];
        const prompt = lastMessage?.content || '';
        
        loadingMessageId = `image-gen-loading-${Date.now()}`;
        const loadingMessage: any = {};
        loadingMessage.id = loadingMessageId;
        loadingMessage.role = 'assistant';
        loadingMessage.content = '';
        loadingMessage.createdAt = new Date();
        loadingMessage.parts = [{ type: 'text', text: '' }];
        // @ts-ignore: Adding custom imageGeneration property
        loadingMessage.imageGeneration = {
          prompt,
          images: [],
          params: body.imageGeneration.params,
          isGenerating: true,
        };

        // Add loading message after a small delay to ensure user message is processed first
        setTimeout(() => {
          (originalSetMessages as any)((prev: any) => {
            return [...prev, loadingMessage];
          });
        }, 50);
      }
      
      const response = await fetch(url, init);

      // Check if response is JSON (e.g. image generation results)
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        // Clone the response so the original stream remains untouched
        const data = await response.clone().json();
        
        // Handle image generation response
        if (data.type === 'image_generation') {
          // Save to database first
          const latestThreadId = threadIdRef.current;
          let realId = loadingMessageId;
          
          if (isConvexId(latestThreadId)) {
            const { selectedModel: currentModel } = useModelStore.getState();
            
            // Save minimal content for image generation messages with metadata
            realId = await sendMessage({
              threadId: latestThreadId as Id<'threads'>,
              role: 'assistant',
              content: '🖼️', // Минимальный контент для сообщений с изображениями
              model: currentModel,
              metadata: {
                imageGeneration: {
                  prompt: data.prompt,
                  images: data.images,
                  params: data.params,
                  isGenerating: false,
                }
              },
            });

            // Save images as attachments to reduce message size
            try {
              const uploadedImages = await Promise.all(
                data.images.map(async (img: any, index: number) => {
                  // Convert base64 to blob
                  const byteCharacters = atob(img.result);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: 'image/png' });
                  
                  // Upload to Convex Storage
                  const uploadUrl = await generateUploadUrl();
                  const uploadResponse = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'image/png' },
                    body: blob,
                  });
                  
                  if (!uploadResponse.ok) {
                    throw new Error(`Failed to upload image ${index + 1}`);
                  }
                  
                  const { storageId } = await uploadResponse.json();
                  return {
                    storageId,
                    name: `generated-image-${index + 1}.png`,
                    type: 'image/png',
                    messageId: realId,
                    size: blob.size,
                  };
                })
              );

              // Save attachment metadata
              if (uploadedImages.length > 0) {
                await saveAttachments({
                  threadId: latestThreadId as Id<'threads'>,
                  attachments: uploadedImages,
                });
              }
            } catch (error) {
              console.error('Failed to save generated images as attachments:', error);
            }
          }

          // Update the loading message with actual images (keep base64 for UI)
          originalSetMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === loadingMessageId);
            if (idx === -1) return prev;
            
            const next = [...prev];
            next[idx] = {
              ...(next[idx] as any),
              id: realId,
              imageGeneration: {
                prompt: data.prompt,
                images: data.images,
                params: data.params,
                isGenerating: false,
              },
            } as any;
            return next;
          });

          // Return a streaming response that immediately ends to keep user message in UI
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.close();
            },
          });
          
          return new Response(stream, {
            status: 200,
            headers: { 
              'Content-Type': 'text/plain; charset=utf-8',
              'X-Vercel-AI-Data-Stream': 'v1'
            },
          });
        }
      }
      
      return response;
    },
    onFinish: async (finalMsg) => {
      const latestThreadId = threadIdRef.current;
      
      // Save only assistant messages to database (user messages already saved in useChatSubmit)
      if (
        finalMsg.role === 'assistant' &&
        finalMsg.content.trim() !== '' &&
        !isConvexId(finalMsg.id) &&
        isConvexId(latestThreadId)
      ) {
        const { selectedModel: currentModel } = useModelStore.getState();

        const realId = await sendMessage({
          threadId: latestThreadId as Id<'threads'>,
          role: 'assistant',
          content: finalMsg.content,
          model: currentModel,
        });

        originalSetMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === finalMsg.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { 
            ...(next[idx] as any), 
            id: realId, 
            model: currentModel 
          } as any;
          return next;
        });
      }
      
      // Clear the first message pending state
      setIsFirstMessagePending(false);
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setIsFirstMessagePending(false);
    },
  });

  // Use original append directly
  const append = originalAppend;

  // Create stable wrappers for functions used in useEffect dependencies
  const setInput = useCallback((value: string | ((prev: string) => string)) => {
    originalSetInput(value);
  }, [originalSetInput]);

  const setMessages = useCallback((value: any) => {
    originalSetMessages(value);
  }, [originalSetMessages]);

  const stop = useCallback(() => {
    originalStop();
  }, [originalStop]);

  // Ensure streaming assistant messages have stable timestamps for ordering
  useEffect(() => {
    if (!messages.some((m) => !m.createdAt)) return;
    originalSetMessages((prev) =>
      prev.map((m) => {
        if (m.createdAt) {
          tempCreatedAtMap.current.delete(m.id);
          return m;
        }

        let ts = tempCreatedAtMap.current.get(m.id);
        if (!ts) {
          ts = Date.now();
          tempCreatedAtMap.current.set(m.id, ts);
        }

        return { ...m, createdAt: new Date(ts) };
      })
    );
  }, [messages, originalSetMessages]);

  // Сбрасываем флаг регенерации когда начинается стриминг
  useEffect(() => {
    if (status === 'streaming' || status === 'submitted') {
      setIsRegenerating(false);
    }
  }, [status]);

  // Принудительно скрываем скелетон после первого сообщения
  const [hasMessages, setHasMessages] = useState(false);
  useEffect(() => {
    if (messages.length > 0) {
      setHasMessages(true);
    }
  }, [messages.length]);

  // Загружаем сообщения с файлами из Convex (если это Convex тред)
  const convexMessages = useQuery(
    api.messages.get,
    isConvexId(currentThreadId) ? { threadId: currentThreadId as Id<'threads'> } : 'skip'
  );

  // Синхронизируем сообщения с Convex, если они загружены
  const mergedMessages = React.useMemo(() => {
    // Если нет Convex сообщений, используем UI сообщения как есть
    if (!convexMessages || convexMessages.length === 0) {
      return messages;
    }

    // Создаем карту UI-сообщений для быстрого доступа
    const uiMessagesMap = new Map(messages.map(m => [m.id, m]));
    // Создаем карту для поиска UI-сообщений по содержимому (для обнаружения дублей)
    const uiContentMap = new Map();
    messages.forEach(m => {
      const key = `${m.role}-${m.content.slice(0, 100)}`;
      if (!uiContentMap.has(key)) {
        uiContentMap.set(key, []);
      }
      uiContentMap.get(key).push(m);
    });

    // Обогащаем сообщения из Convex данными из локального UI-состояния
    const enrichedConvexMessages = convexMessages.map(convexMsg => {
      const uiMsg = uiMessagesMap.get(convexMsg._id);
      
      // Если есть соответствующее UI-сообщение, объединяем их
      if (uiMsg) {
        return {
          ...convexMsg, // Берем за основу данные из БД (_id, _creationTime)
          ...uiMsg,     // Перезаписываем поля из локального состояния (content, imageGeneration и т.д.)
          id: convexMsg._id, // Убеждаемся что ID из БД
          createdAt: new Date(convexMsg.createdAt),
          // Приоритет: локальные данные -> metadata из БД
          imageGeneration: (uiMsg as any).imageGeneration || (convexMsg as any).metadata?.imageGeneration,
          attachments: (uiMsg as any).attachments || convexMsg.attachments || [],
        };
      }
      
      // Если UI-сообщения нет, просто форматируем сообщение из БД
      return {
        id: convexMsg._id as string,
        role: convexMsg.role as 'user' | 'assistant',
        content: convexMsg.content,
        createdAt: new Date(convexMsg.createdAt),
        parts: [{ type: 'text' as const, text: convexMsg.content }],
        attachments: (convexMsg as any).attachments || [],
        // Извлекаем imageGeneration из metadata
        imageGeneration: (convexMsg as any).metadata?.imageGeneration,
      };
    });

    // Добавляем временные сообщения, которых еще нет в Convex
    const convexIds = new Set(convexMessages.map(cm => cm._id as string));
    
    const temporaryMessages = messages.filter(m => {
      // Исключаем сообщения, которые уже есть в Convex по ID
      if (convexIds.has(m.id)) return false;
      
      // Всегда показываем новые временные сообщения (не в БД)
      return true;
    });
    
    // Объединяем и сортируем
    const allMessages = [...enrichedConvexMessages, ...temporaryMessages];
    
    const getTime = (m: { id: string; createdAt?: Date | string }) => {
      if (m.createdAt) {
        return m.createdAt instanceof Date
          ? m.createdAt.getTime()
          : new Date(m.createdAt).getTime();
      }
      if (!tempCreatedAtMap.current.has(m.id)) {
        tempCreatedAtMap.current.set(m.id, Date.now());
      }
      return tempCreatedAtMap.current.get(m.id)!;
    };

    // Deterministic ordering:
    // 1. Primary key  – creation time (older first)
    // 2. Secondary key – role (user above assistant if timestamps match)
    // 3. Fallback      – lexical compare of IDs for complete stability
    allMessages.sort((a, b) => {
      const ta = getTime(a);
      const tb = getTime(b);

      // Primary: by time
      if (ta !== tb) return ta - tb;

      // Secondary: user messages should appear before assistant messages
      if (a.role !== b.role) {
        return a.role === 'user' ? -1 : 1;
      }

      // Tertiary: stable order by id to avoid flaky re-renders
      return a.id.localeCompare(b.id);
    });

    return allMessages;
  }, [messages, convexMessages]);



  // Register setter so that other components can alter the input value
  const registerInputSetter = useChatStore((s) => s.registerInputSetter);
  useEffect(() => {
    registerInputSetter(setInput);
  }, [setInput, registerInputSetter]);

  // Sync when navigating between chats or dialog versions
  useEffect(() => {
    const prevThreadId = threadIdRef.current;
    setCurrentThreadId(threadId);
    threadIdRef.current = threadId;
    
    
    // Создаем новый уникальный ключ для useChat при смене чата
    setChatKey(`chat-${threadId || 'new'}-${Date.now()}`);
    
    // Полная очистка состояния только при переходе на совершенно новый чат
    if (!threadId || threadId === 'new') {
      // Очищаем только если это действительно новый чат, а не навигация с initialMessages
      if (initialMessages.length === 0) {
        setInput('');
        clearQuote();
        clearAttachments();
        setMessages([]); // Очищаем сообщения
        stop(); // Останавливаем любой активный стрим
      } else {
        // Если есть initialMessages, используем их (случай навигации с проектной страницы)
        setMessages(initialMessages);
      }
    } else {
      // Для существующего чата загружаем состояние
      // Если это навигация с initialMessages (например, с проектной страницы), используем их
      if (initialMessages.length > 0 && prevThreadId !== threadId) {
        setMessages(initialMessages);
      } else {
        setMessages(initialMessages);
      }
      const draft = loadDraft(threadId);
      if (draft) {
        if (draft.input) setInput(draft.input);
        if (draft.messages.length > 0) {
          setMessages((prev: any) => [...prev, ...draft.messages]);
        }
      }
      // Remember last active chat for automatic restoration on reload
      saveLastChatId(threadId);
    }
  }, [threadId, initialMessages, setInput, setMessages, clearQuote, clearAttachments, stop]);

  // Persist unsent messages and input as a draft
  useEffect(() => {
    const unsent = messages.filter((m) => !isConvexId(m.id));
    if (unsent.length === 0 && !input.trim()) {
      clearDraft(threadIdRef.current);
      return;
    }
    saveDraft(threadIdRef.current, {
      input,
      messages: unsent,
    });
  }, [messages, input]);


  // Wrap the stop function to also stop image generation properly
  const stopWithCleanup = useCallback(() => {
    // Abort the current fetch/stream
    stop();

    // Stop image generation animations and mark as stopped
    originalSetMessages((prev) => prev.map((m) => {
      const imgGen = (m as any).imageGeneration;
      if (imgGen && imgGen.isGenerating) {
        return {
          ...m,
          imageGeneration: {
            ...imgGen,
            isGenerating: false,
            isStopped: true, // Добавляем флаг остановки
          }
        };
      }
      return m;
    }));
    // Exit image generation mode if it was enabled
    const { setImageGenerationMode } = useChatStore.getState();
    setImageGenerationMode(false);
  }, [stop, originalSetMessages]);

  // Determine if there are any messages or if a message is being processed
  const hasAnyMessages =
    mergedMessages.length > 0 || status === 'submitted' || status === 'streaming';

  return (
    <>
      {mergedMessages.length > 0 && showNavBars && (
        <ChatNavigationBars
          messages={mergedMessages}
          scrollToMessage={scrollToMessage}
        />
      )}

      <div className={cn(
        "flex-1 flex flex-col relative",
        customLayout && "min-h-0" // Обеспечиваем правильное поведение flex для customLayout
      )}>
        {hasAnyMessages && (
          <div
            className="flex-1 overflow-y-auto enhanced-scroll"
            id="messages-scroll-area"
          >
            <main className={cn(
              "w-full mx-auto min-h-full flex-1",
              customLayout ? "px-0 pt-0 pb-0" : "max-w-3xl pt-24 pb-44 px-4"
            )}>
              {hasAnyMessages && (
                <LazyMessages
                  threadId={currentThreadId}
                  messages={mergedMessages}
                  status={status}
                  setMessages={setMessages}
                  reload={reload}
                  append={append}
                  error={error}
                  stop={stopWithCleanup}
                  forceRegeneration={forceRegeneration}
                  isRegenerating={isRegenerating}
                  isFirstMessagePending={isFirstMessagePending}
                />
              )}
              <div ref={messagesEndRef} />
            </main>
          </div>
        )}
        
        {/* ChatInput всегда отображается */}
        <div
          className={cn(
            customLayout 
              ? 'relative w-full max-w-none transition-all duration-300 z-30 flex-shrink-0'
              : 'fixed left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 transition-all duration-300 z-30',
            !customLayout && (isMobile ? 'bottom-0' : (hasAnyMessages ? 'bottom-0' : 'top-1/2 -translate-y-1/2')),
          )}
        >
          
          <LazyChatInput
            threadId={currentThreadId}
            thread={thread}
            input={input}
            status={status}
            reload={reload}
            setInput={setInput}
            setMessages={setMessages}
            append={append}
            stop={stopWithCleanup}
            error={error}
            messageCount={mergedMessages.length}
            onThreadCreated={handleThreadCreated}
            projectId={projectId}
          />
        </div>
      </div>
    </>
  );
});

export default ChatView;

