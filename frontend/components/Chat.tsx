"use client";

import { useChat } from '@ai-sdk/react';
import Messages from './Messages';
import ChatInput from './ChatInput';
import ChatHistoryButton from './ChatHistoryButton';
import NewChatButton from './NewChatButton';
import { UIMessage } from 'ai';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import SettingsButton from './SettingsButton';
import { useQuoteShortcuts } from '@/frontend/hooks/useQuoteShortcuts';
import { useScrollHide } from '@/frontend/hooks/useScrollHide';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { useKeyboardInsets } from '../hooks/useKeyboardInsets';
import { cn } from '@/lib/utils';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useStreamBuffer } from '../hooks/useStreamBuffer';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import { toast } from 'sonner';
import { Id } from '@/convex/_generated/dataModel';

interface ChatProps {
  threadId: string;
  initialMessages: UIMessage[];
}

export default function Chat({ threadId, initialMessages }: ChatProps) {
  const { keys, hasRequiredKeys, keysLoading } = useAPIKeyStore();
  const { selectedModel } = useModelStore();
  const { isMobile } = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  const isHeaderVisible = useScrollHide<HTMLDivElement>({ threshold: 15, panelRef });
  const [renderMessages, setRenderMessages] = useState<UIMessage[]>(initialMessages);
  const lastContentRef = useRef(initialMessages.at(-1)?.content || '');
  const bufferMessages = useStreamBuffer((delta: string) => {
    setRenderMessages(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role !== 'assistant') return prev;
      const updated = { ...last, content: (last.content || '') + delta, parts: [{ type: 'text', text: (last.content || '') + delta }] } as UIMessage;
      return [...prev.slice(0, -1), updated];
    });
  });
  const navigate = useNavigate();
  useKeyboardInsets((h) => {
    document.documentElement.style.setProperty('--keyboard-inset-height', `${h}px`);
  });
  // Track the current thread ID locally to ensure it exists before sending messages
  const [currentThreadId, setCurrentThreadId] = useState(threadId);

  // Sync local thread ID with route changes
  useEffect(() => {
    setCurrentThreadId(threadId);
  }, [threadId]);
  const sendMessage = useMutation<typeof api.messages.send>(api.messages.send);
  const hasKeys = useMemo(() => hasRequiredKeys(), [hasRequiredKeys]);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useQuoteShortcuts();


  // Отслеживание видимости клавиатуры на мобильных устройствах
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const heightDifference = windowHeight - viewportHeight;
      
      // Если разница больше 150px, считаем что клавиатура открыта
      setIsKeyboardVisible(heightDifference > 150);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMobile]);

  const {
    messages,
    input,
    setInput,
    setMessages,
    reload,
    stop,
    status,
    error,
  } = useChat({
    id: currentThreadId,
    initialMessages,
    body: {
      apiKeys: keys,
      model: selectedModel,
      net: (navigator as any).connection?.effectiveType ?? '4g',
      threadId: currentThreadId,
    },
    experimental_throttle: 20,
    experimental_prepareRequestBody: ({ messages }) => {
      // Подготавливаем сообщения с правильными ID для API
      const messagesWithIds = messages.map(msg => ({
        ...msg,
        id: msg.id, // Убеждаемся, что ID передается
      }));
      
      
      return {
        messages: messagesWithIds,
        model: selectedModel,
        apiKeys: keys,
        net: (navigator as any).connection?.effectiveType ?? '4g',
        threadId: currentThreadId,
      };
    },
    onFinish: async (message) => {
      if (!isConvexId(currentThreadId)) {
        return;
      }
      const dbId = await sendMessage({
        threadId: currentThreadId as Id<'threads'>,
        role: 'assistant',
        content: message.content,
      });
      // Replace last message id with real database id
      setMessages(prev =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, id: dbId } : m
        )
      );
    },
  });

  useEffect(() => {
    if (status === 'streaming') {
      const latest = messages[messages.length - 1];
      // Проверяем, что последнее сообщение действительно от ассистента
      if (latest && latest.role === 'assistant') {
        const prev = lastContentRef.current;
        const diff = latest?.content.slice(prev.length) || '';
        if (diff) bufferMessages(diff);
        lastContentRef.current = latest?.content || prev;
      }
    } else {
      setRenderMessages(messages);
      lastContentRef.current = messages[messages.length - 1]?.content || '';
    }
  }, [messages, status, bufferMessages]);


  return (
    <div className="relative w-full min-h-screen flex flex-col">
      {renderMessages.length === 0 ? (
        // Когда нет сообщений - поле ввода по центру
        <main className="flex-1 flex flex-col justify-center items-center w-full max-w-3xl mx-auto px-4">
          <ChatInput
            threadId={currentThreadId}
            input={input}
            status={status}
            reload={reload}
            setInput={setInput}
            setMessages={setMessages}
            stop={stop}
            messageCount={renderMessages.length}
            error={error}
            onThreadCreated={setCurrentThreadId}
          />
        </main>
      ) : (
        // Когда есть сообщения - обычная разметка
        <>
          <main className="flex-1 w-full max-w-3xl mx-auto pt-10 pb-4">
            <Messages
              threadId={currentThreadId}
              messages={renderMessages}
              status={status}
              setMessages={setMessages}
              reload={reload}
              error={error}
              stop={stop}
            />
          </main>
          <div className="sticky bottom-0 w-full">
            <ChatInput
              threadId={currentThreadId}
              input={input}
              status={status}
              reload={reload}
              setInput={setInput}
              setMessages={setMessages}
              stop={stop}
              messageCount={renderMessages.length}
              error={error}
              onThreadCreated={setCurrentThreadId}
            />
          </div>
        </>
      )}
      
      {/* Logo in top left with blur background */}
      <div className={cn(
        "fixed left-4 top-4 z-20 transition-all duration-300 ease-in-out",
        isMobile && (!isHeaderVisible || isKeyboardVisible) && "transform -translate-x-full opacity-0"
      )}>
        <div className="relative">
          {/* Blur background for mobile */}
          {isMobile && (
            <div className="absolute inset-0 -m-2 bg-background/60 backdrop-blur-md rounded-lg" />
          )}
          <span 
            className="relative text-xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
            onClick={() => window.location.href = '/chat'}
          >
            Pak.Chat
          </span>
        </div>
      </div>

      {/* Top buttons */}
      <div
        ref={panelRef}
        className={cn(
          "fixed right-4 top-4 z-20 flex gap-2 p-1 bg-background/60 backdrop-blur-md rounded-lg border border-border/20 transition-transform duration-300 ease-in-out",
          isMobile && (!isHeaderVisible || isKeyboardVisible) && "transform translate-x-[calc(100%-3rem)]"
        )}
      >
        {!keysLoading && hasKeys && (
          <NewChatButton className="backdrop-blur-sm" />
        )}
        <ChatHistoryButton className="backdrop-blur-sm" />
        <SettingsButton className={cn(
          "backdrop-blur-sm transition-opacity duration-300",
          isMobile && (!isHeaderVisible || isKeyboardVisible) && "opacity-0 pointer-events-none"
        )} />
      </div>
    </div>
  );
}
