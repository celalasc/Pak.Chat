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
import React, { useEffect, useRef, useState } from 'react';
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
  const { selectedModel } = useModelStore();
  const { clearQuote } = useQuoteStore();
  const { clear: clearAttachments } = useAttachmentsStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentThreadId, setCurrentThreadId] = useState(threadId);
  const submittedMessageIdRef = useRef<string | null>(null);

  const sendMessage = useMutation<typeof api.messages.send>(api.messages.send);

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

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
    body: {
      apiKeys: keys,
      model: selectedModel,
      threadId: currentThreadId,
    },
    experimental_prepareRequestBody: ({ messages }) => ({
      messages: messages.map((m) => ({ ...m, id: m.id })),
      model: selectedModel,
      apiKeys: keys,
      threadId: currentThreadId,
    }),
    onFinish: async (finalMsg) => {
      if (
        finalMsg.role === 'assistant' &&
        !isConvexId(finalMsg.id) &&
        isConvexId(currentThreadId)
      ) {
        const realId = await sendMessage({
          threadId: currentThreadId as Id<'threads'>,
          role: 'assistant',
          content: finalMsg.content,
          model: selectedModel,
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === finalMsg.id ? { ...(m as any), id: realId, model: selectedModel } : m,
          ),
        );
      }
    },
  });

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

  // Auto-reload when a user message without assistant response appears
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      status === 'ready' &&
      lastMessage?.role === 'user' &&
      isConvexId(lastMessage.id) &&
      isConvexId(currentThreadId) &&
      submittedMessageIdRef.current !== lastMessage.id
    ) {
      submittedMessageIdRef.current = lastMessage.id;
      reload();
    }
  }, [messages, status, reload, currentThreadId]);

  return (
    <>
      {messages.length > 0 && showNavBars && (
        <ChatNavigationBars messages={messages} scrollToMessage={scrollToMessage} />
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