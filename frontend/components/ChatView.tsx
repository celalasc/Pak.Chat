"use client";

import { useChat } from '@ai-sdk/react';
import Messages from './Messages';
import ChatInput from './ChatInput';
import ChatNavigationBars from './ChatNavigationBars';
import ScrollToBottomButton from './ScrollToBottomButton';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import { useAttachmentsStore } from '@/frontend/stores/AttachmentsStore';
import { useChatStore } from '@/frontend/stores/ChatStore';
import { cn } from '@/lib/utils';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import { Id, Doc } from '@/convex/_generated/dataModel';
import type { UIMessage } from 'ai';

import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { loadDraft, saveDraft, clearDraft } from '@/frontend/lib/drafts';
import { saveLastChatId } from '@/frontend/lib/lastChat';
import { getModelConfig } from '@/lib/models';

interface ChatViewProps {
  threadId: string;
  thread: Doc<'threads'> | null | undefined;
  initialMessages: UIMessage[];
  showNavBars: boolean;
  onThreadCreated?: (newThreadId: string) => void;
}

function ChatView({ threadId, thread, initialMessages, showNavBars, onThreadCreated }: ChatViewProps) {
  const { keys } = useAPIKeyStore();
  const { selectedModel, webSearchEnabled } = useModelStore();
  const { clearQuote } = useQuoteStore();
  const { clear: clearAttachments } = useAttachmentsStore();
  const { isMobile } = useIsMobile();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentThreadId, setCurrentThreadId] = useState(threadId);
  
  // Состояние для отслеживания регенераций
  const [isRegenerating, setIsRegenerating] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Флаг для отслеживания первоначальной загрузки чата
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  
  // Уникальный ключ для принудительного пересоздания useChat хука
  const [chatKey, setChatKey] = useState(() => `chat-${threadId || 'new'}-${Date.now()}`);

  // Определяем какой API endpoint использовать в зависимости от провайдера
  const modelConfig = React.useMemo(() => {
    const config = getModelConfig(selectedModel);
    return config;
  }, [selectedModel]);

  const { isImageGenerationMode } = useChatStore(); // Get from store to track changes
  
  const apiEndpoint = React.useMemo(() => {
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

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    }
  };

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

  // Memoize body and request preparation to avoid creating new references
  const requestBody = React.useMemo(
    () => ({
      model: selectedModel,
      apiKeys: keys,
      threadId: currentThreadId,
      search: webSearchEnabled,
    }),
    [selectedModel, keys, currentThreadId, webSearchEnabled]
  );

  const prepareRequestBody = React.useCallback(
    ({ messages }: { messages: UIMessage[] }) => {
      const currentThreadId = threadIdRef.current;
      const { isImageGenerationMode, imageGenerationParams } = useChatStore.getState();
      
      const body = {
        messages: messages.map((m) => ({ ...m, id: m.id })),
        model: selectedModel,
        apiKeys: keys,
        threadId: currentThreadId,
        search: webSearchEnabled,
        imageGeneration: isImageGenerationMode ? {
          enabled: true,
          params: imageGenerationParams
        } : undefined,
      };

      // Debug log
      if (isImageGenerationMode) {
        // ChatView prepareRequestBody debug removed
      }

      return body;
    },
    [selectedModel, keys, webSearchEnabled]
  );

  const {
    messages,
    input,
    setInput,
    setMessages,
    reload,
    stop,
    append,
    status,
    error,
  } = useChat({
    api: apiEndpoint,
    id: chatKey,
    initialMessages,
    body: requestBody,
    experimental_prepareRequestBody: prepareRequestBody,
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
          (setMessages as any)((prev: any) => {
            return [...prev, loadingMessage];
          });
        }, 50);
      }
      
      const response = await fetch(url, init);
      
      // Check if response is JSON (image generation)
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        
        // Handle image generation response
        if (data.type === 'image_generation') {
          // Save to database first
          const latestThreadId = threadIdRef.current;
          let realId = loadingMessageId;
          
          if (isConvexId(latestThreadId)) {
            const { selectedModel: currentModel } = useModelStore.getState();
            
            // Save minimal content for image generation messages
            realId = await sendMessage({
              threadId: latestThreadId as Id<'threads'>,
              role: 'assistant',
              content: '🖼️', // Минимальный контент для сообщений с изображениями
              model: currentModel,
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
          setMessages((prev) => {
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

        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === finalMsg.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...(next[idx] as any), id: realId, model: currentModel } as any;
          return next;
        });
      }
    },
  });

  // Сбрасываем флаг регенерации когда начинается стриминг
  useEffect(() => {
    if (status === 'streaming' || status === 'submitted') {
      setIsRegenerating(false);
    }
  }, [status]);

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

    // Если есть Convex сообщения, используем их как основу
    const convexAsUIMessages = convexMessages.map(cm => ({
      id: cm._id as string,
      role: cm.role as 'user' | 'assistant',
      content: cm.content,
      createdAt: new Date(cm.createdAt),
      parts: [{ type: 'text' as const, text: cm.content }],
      attachments: cm.attachments || [],
    }));

    // Добавляем только новые/временные сообщения от useChat (которые еще не сохранены в Convex)
    const convexIds = new Set(convexMessages.map(cm => cm._id as string));
    const temporaryMessages = messages.filter(m => !convexIds.has(m.id) && !isConvexId(m.id));

    const getTime = (value: any) => {
      if (!value) return 0;
      return value instanceof Date ? value.getTime() : new Date(value).getTime();
    };

    const allMessages = [...convexAsUIMessages, ...temporaryMessages]
      .sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt));

    return allMessages;
  }, [messages, convexMessages]);



  // Register setter so that other components can alter the input value
  const registerInputSetter = useChatStore((s) => s.registerInputSetter);
  useEffect(() => {
    registerInputSetter(setInput);
  }, [setInput, registerInputSetter]);

  // Sync when navigating between chats or dialog versions
  useEffect(() => {
    setCurrentThreadId(threadId);
    threadIdRef.current = threadId;
    
    // Создаем новый уникальный ключ для useChat при смене чата
    setChatKey(`chat-${threadId || 'new'}-${Date.now()}`);
    
    // Полная очистка состояния для нового чата
    if (!threadId) {
      setInput('');
      clearQuote();
      clearAttachments();
      setMessages([]); // Очищаем сообщения
      stop(); // Останавливаем любой активный стрим
    } else {
      // Для существующего чата загружаем состояние
      setMessages(initialMessages);
      const draft = loadDraft(threadId);
      if (draft) {
        if (draft.input) setInput(draft.input);
        if (draft.messages.length > 0) {
          setMessages((prev) => [...prev, ...draft.messages]);
        }
      }
      // Remember last active chat for automatic restoration on reload
      saveLastChatId(threadId);
    }
  }, [threadId, setInput, setMessages, clearQuote, clearAttachments, stop]);

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

  // Автоматическая прокрутка к концу переписки при заходе в чат
  useEffect(() => {
    // Прокручиваем к концу только если:
    // 1. Есть сообщения для отображения
    // 2. Еще не прокручивали для текущего чата
    // 3. Это не новый чат (threadId не пустой)
    if (mergedMessages.length > 0 && !hasScrolledToEnd && threadId) {
      const scrollToEnd = () => {
        // Моментальная прокрутка при заходе в чат
        if (messagesEndRef.current) {
          // Прокрутка через messagesEndRef
          messagesEndRef.current.scrollIntoView({ 
            behavior: 'instant', 
            block: 'end' 
          });
        } else {
          // Альтернативная прокрутка через контейнер сообщений
          const scrollArea = document.getElementById('messages-scroll-area');
          if (scrollArea) {
            scrollArea.scrollTo({
              top: scrollArea.scrollHeight,
              behavior: 'instant',
            });
          }
        }
      };

      // Небольшая задержка для обеспечения полной загрузки DOM
      const timeoutId = setTimeout(scrollToEnd, 100);
      setHasScrolledToEnd(true);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [mergedMessages.length, hasScrolledToEnd, threadId]);

  // Сброс флага прокрутки при смене чата
  useEffect(() => {
    setHasScrolledToEnd(false);
  }, [threadId]);

  return (
    <>
      {mergedMessages.length > 0 && showNavBars && (
        <ChatNavigationBars 
          messages={mergedMessages} 
          scrollToMessage={scrollToMessage} 
        />
      )}

      <div className="flex-1 flex flex-col relative">
        <div
          className="flex-1 overflow-y-auto"
          id="messages-scroll-area"
          ref={scrollContainerRef}
        >
          <main className="w-full max-w-3xl mx-auto pt-24 pb-44 px-4 min-h-full flex-1">
            {mergedMessages.length > 0 && (
              <Messages
                threadId={currentThreadId}
                messages={mergedMessages}
                status={status}
                setMessages={setMessages}
                reload={reload}
                append={append}
                error={error}
                stop={stop}
                forceRegeneration={forceRegeneration}
                isRegenerating={isRegenerating}
              />
            )}
            <div ref={messagesEndRef} />
          </main>
        </div>

        <div
          className={cn(
            'fixed left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 transition-all duration-300 z-30',
            isMobile ? 'bottom-0' : (mergedMessages.length > 0 ? 'bottom-0' : 'top-1/2 -translate-y-1/2'),
          )}
        >
          {/* Scroll to bottom button */}
          {mergedMessages.length > 0 && (
            <div className="absolute right-8 -top-16 z-50">
              <ScrollToBottomButton />
            </div>
          )}
          
          <ChatInput
            threadId={currentThreadId}
            thread={thread}
            input={input}
            status={status}
            reload={reload}
            setInput={setInput}
            setMessages={setMessages}
            append={append}
            stop={stop}
            error={error}
            messageCount={mergedMessages.length}
            onThreadCreated={handleThreadCreated}
          />
        </div>


      </div>
    </>
  );
}

export default React.memo(ChatView);