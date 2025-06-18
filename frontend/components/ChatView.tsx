"use client";

import { useChat } from '@ai-sdk/react';
import Messages from './Messages';
import ChatInput from './ChatInput';
import ChatNavigationBars from './ChatNavigationBars';
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
import { useDebounceCallback } from 'usehooks-ts';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { loadDraft, saveDraft, clearDraft } from '@/frontend/lib/drafts';

interface ChatViewProps {
  threadId: string;
  thread: Doc<'threads'> | null | undefined;
  initialMessages: UIMessage[];
  showNavBars: boolean;
}

function ChatView({ threadId, thread, initialMessages, showNavBars }: ChatViewProps) {
  const { keys } = useAPIKeyStore();
  const { selectedModel, webSearchEnabled } = useModelStore();
  const { clearQuote } = useQuoteStore();
  const { clear: clearAttachments } = useAttachmentsStore();
  const { isMobile } = useIsMobile();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentThreadId, setCurrentThreadId] = useState(threadId);
  const [currentMessageId, setCurrentMessageId] = useState<string | undefined>();

  // Keep latest thread ID in a ref to avoid stale closures in callbacks
  const threadIdRef = useRef<string>(threadId);
  useEffect(() => {
    threadIdRef.current = currentThreadId;
  }, [currentThreadId]);

  const sendMessage = useMutation<typeof api.messages.send>(api.messages.send);

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

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
    ({ messages }: { messages: UIMessage[] }) => ({
      messages: messages.map((m) => ({ ...m, id: m.id })),
      ...requestBody,
    }),
    [requestBody]
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
    api: '/api/llm',
    id: currentThreadId,
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



    // Создаем мапу Convex сообщений для быстрого поиска
    const convexMap = new Map(convexMessages.map(cm => [cm._id as string, cm]));

    // Обновляем UI сообщения с данными из Convex
    const updatedMessages = messages.map(uiMessage => {
      const convexMessage = convexMap.get(uiMessage.id);
      if (convexMessage) {
        const merged = {
          ...uiMessage,
          attachments: convexMessage.attachments || [],
        };
        if (convexMessage.attachments && convexMessage.attachments.length > 0) {
  
        }
        return merged;
      }
      return uiMessage;
    });

    // Добавляем сообщения из Convex, которых нет в UI (например, при обновлении страницы)
    const uiIds = new Set(messages.map(m => m.id));
    const missingConvexMessages = convexMessages
      .filter(cm => !uiIds.has(cm._id as string))
      .map(cm => ({
        id: cm._id as string,
        role: cm.role as 'user' | 'assistant',
        content: cm.content,
        createdAt: new Date(cm.createdAt),
        parts: [{ type: 'text' as const, text: cm.content }],
        attachments: cm.attachments || [],
      }));

    const allMessages = [...updatedMessages, ...missingConvexMessages]
      .sort((a, b) => {
        const aTime = a.createdAt ? a.createdAt.getTime() : Date.now();
        const bTime = b.createdAt ? b.createdAt.getTime() : Date.now();
        return aTime - bTime;
      });

    
    return allMessages;
  }, [messages, convexMessages]);

  // Функция для отслеживания видимых сообщений
  const updateCurrentMessage = useCallback(() => {
    const userMessages = mergedMessages.filter((message: UIMessage) => message.role === 'user');
    if (userMessages.length === 0) return;

    let currentMsg = userMessages[0];
    let minDistance = Infinity;

    userMessages.forEach((message: UIMessage) => {
      const element = document.getElementById(`message-${message.id}`);
      if (element) {
        const rect = element.getBoundingClientRect();
        const center = window.innerHeight / 2;
        const distance = Math.abs(rect.top + rect.height / 2 - center);
        
        if (distance < minDistance) {
          minDistance = distance;
          currentMsg = message;
        }
      }
    });

    if (currentMessageId !== currentMsg.id) {
      setCurrentMessageId(currentMsg.id);
    }
  }, [mergedMessages, currentMessageId]);
  
  const debouncedUpdateCurrentMessage = useDebounceCallback(updateCurrentMessage, 50, { leading: true });

  // Добавляем обработчик скролла
  useEffect(() => {
    const scrollArea = document.getElementById('messages-scroll-area');
    if (!scrollArea) return;

    const handleScroll = () => {
      debouncedUpdateCurrentMessage();
    };

    scrollArea.addEventListener('scroll', handleScroll, { passive: true });
    // Также обновляем при изменении сообщений
    debouncedUpdateCurrentMessage();

    return () => {
      scrollArea.removeEventListener('scroll', handleScroll);
    };
  }, [debouncedUpdateCurrentMessage]);

  // Register setter so that other components can alter the input value
  const registerInputSetter = useChatStore((s) => s.registerInputSetter);
  useEffect(() => {
    registerInputSetter(setInput);
  }, [setInput, registerInputSetter]);

  // Sync when navigating between chats or dialog versions
  useEffect(() => {
    setCurrentThreadId(threadId);
    if (!threadId) {
      setInput('');
      clearQuote();
      clearAttachments();
    }
    setMessages(initialMessages);

    const draft = loadDraft(threadId);
    if (draft) {
      if (draft.input) setInput(draft.input);
      if (draft.messages.length > 0) {
        setMessages((prev) => [...prev, ...draft.messages]);
      }
    }
  }, [threadId, setInput, clearQuote, clearAttachments, setMessages, initialMessages]);

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

  return (
    <>
      {mergedMessages.length > 0 && showNavBars && (
        <ChatNavigationBars 
          messages={mergedMessages} 
          scrollToMessage={scrollToMessage} 
          currentMessageId={currentMessageId}
        />
      )}

      <div className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-y-auto" id="messages-scroll-area">
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
            onThreadCreated={setCurrentThreadId}
          />
        </div>


      </div>
    </>
  );
}

export default React.memo(ChatView); 