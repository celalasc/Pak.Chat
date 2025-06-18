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
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import { Id } from '@/convex/_generated/dataModel';
import type { UIMessage } from 'ai';

interface ChatViewProps {
  threadId: string;
  initialMessages: UIMessage[];
  showNavBars: boolean;
}

function ChatView({ threadId, initialMessages, showNavBars }: ChatViewProps) {
  const { keys } = useAPIKeyStore();
  const { selectedModel, webSearchEnabled } = useModelStore();
  const { clearQuote } = useQuoteStore();
  const { clear: clearAttachments } = useAttachmentsStore();

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
        const realId = await sendMessage({
          threadId: latestThreadId as Id<'threads'>,
          role: 'assistant',
          content: finalMsg.content,
          model: selectedModel,
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === finalMsg.id
              ? { ...(m as any), id: realId, model: selectedModel }
              : m,
          ),
        );
      }
    },
  });

  // Функция для отслеживания видимых сообщений
  const updateCurrentMessage = useCallback(() => {
    const userMessages = messages.filter(message => message.role === 'user');
    if (userMessages.length === 0) return;

    let currentMsg = userMessages[0];
    let minDistance = Infinity;

    userMessages.forEach(message => {
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

    setCurrentMessageId(currentMsg.id);
  }, [messages]);

  // Добавляем обработчик скролла
  useEffect(() => {
    const scrollArea = document.getElementById('messages-scroll-area');
    if (!scrollArea) return;

    const handleScroll = () => {
      updateCurrentMessage();
    };

    scrollArea.addEventListener('scroll', handleScroll);
    // Также обновляем при изменении сообщений
    updateCurrentMessage();

    return () => {
      scrollArea.removeEventListener('scroll', handleScroll);
    };
  }, [updateCurrentMessage]);

  // Register setter so that other components can alter the input value
  const registerInputSetter = useChatStore((s) => s.registerInputSetter);
  useEffect(() => {
    registerInputSetter(setInput);
  }, [setInput, registerInputSetter]);

  // Sync when navigating between chats
  useEffect(() => {
    setCurrentThreadId(threadId);
    if (!threadId) {
      setInput('');
      clearQuote();
      clearAttachments();
    }
    setMessages(initialMessages);
  }, [threadId, setInput, clearQuote, clearAttachments, setMessages, initialMessages]);

  return (
    <>
      {messages.length > 0 && showNavBars && (
        <ChatNavigationBars 
          messages={messages} 
          scrollToMessage={scrollToMessage} 
          currentMessageId={currentMessageId}
        />
      )}

      <div className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-y-auto" id="messages-scroll-area">
          <main className="w-full max-w-3xl mx-auto pt-24 pb-44 px-4 min-h-full flex-1">
            {messages.length > 0 && (
              <Messages
                threadId={currentThreadId}
                messages={messages}
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
            messages.length > 0 ? 'bottom-0' : 'top-1/2 -translate-y-1/2',
          )}
        >
          <ChatInput
            threadId={currentThreadId}
            input={input}
            status={status}
            reload={reload}
            setInput={setInput}
            setMessages={setMessages}
            append={append}
            stop={stop}
            error={error}
            messageCount={messages.length}
            onThreadCreated={setCurrentThreadId}
          />
        </div>
      </div>
    </>
  );
}

export default React.memo(ChatView); 