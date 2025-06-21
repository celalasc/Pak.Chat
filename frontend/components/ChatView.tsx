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

  const apiEndpoint = React.useMemo(() => {
    // Используем новый endpoint для Google моделей
    return modelConfig.provider === 'google' ? '/api/llm-google' : '/api/llm';
  }, [modelConfig.provider]);

  // Keep latest thread ID in a ref to avoid stale closures in callbacks
  const threadIdRef = useRef<string>(threadId);
  useEffect(() => {
    threadIdRef.current = currentThreadId;
  }, [currentThreadId]);

  const sendMessage = useMutation<typeof api.messages.send>(api.messages.send);

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
      // Используем актуальный threadId из ref вместо мемоизированного requestBody
      const currentThreadId = threadIdRef.current;
      const body = {
        messages: messages.map((m) => ({ ...m, id: m.id })),
        model: selectedModel,
        apiKeys: keys,
        threadId: currentThreadId,
        search: webSearchEnabled,
      };

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
    id: chatKey, // Используем уникальный ключ для принудительного пересоздания
    initialMessages,
    body: requestBody,
    experimental_prepareRequestBody: prepareRequestBody,
    onFinish: async (finalMsg) => {
      const latestThreadId = threadIdRef.current;
      
      if (
        finalMsg.role === 'assistant' &&
        finalMsg.content.trim() !== '' &&
        !isConvexId(finalMsg.id) &&
        isConvexId(latestThreadId)
      ) {
        // Persist the assistant message with the **model actually used**.
        const { selectedModel: currentModel } = useModelStore.getState();

        const realId = await sendMessage({
          threadId: latestThreadId as Id<'threads'>,
          role: 'assistant',
          content: finalMsg.content,
          model: currentModel,
        });

        // Replace the temporary message ID with the real Convex ID
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === finalMsg.id);

          // If the message is already replaced or not found, skip updating to
          // avoid creating an identical array that would trigger another rerender.
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