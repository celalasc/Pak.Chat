"use client";

import { useChat } from '@ai-sdk/react';
import Messages from './Messages';
import ChatInput from './ChatInput';
import ChatHistoryButton from './ChatHistoryButton';
import NewChatButton from './NewChatButton';
import ChatNavigationBars from './ChatNavigationBars';
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
import { useDebouncedCallback } from 'use-debounce';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import { toast } from 'sonner';
import { Id } from '@/convex/_generated/dataModel';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import { useAttachmentsStore } from '@/frontend/stores/AttachmentsStore';
import { useMessageVersionStore } from '@/frontend/stores/MessageVersionStore';

interface ChatProps {
  threadId: string;
  initialMessages: UIMessage[];
}

export default function Chat({ threadId, initialMessages }: ChatProps) {
  const { keys, hasRequiredKeys, keysLoading } = useAPIKeyStore();
  const { selectedModel } = useModelStore();
  const { isMobile } = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isHeaderVisible = useScrollHide<HTMLDivElement>({ threshold: 15, panelRef });
  const navigate = useNavigate();
  const { clearQuote } = useQuoteStore();
  const { clear: clearAttachments } = useAttachmentsStore();
  
  useKeyboardInsets((h) => {
    document.documentElement.style.setProperty('--keyboard-inset-height', `${h}px`);
  });
  // Track the current thread ID locally to ensure it exists before sending messages
  const [currentThreadId, setCurrentThreadId] = useState(threadId);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Sync local thread ID with route changes
  useEffect(() => {
    setCurrentThreadId(threadId);
    // Сбрасываем состояние сохраненных сообщений при смене треда
    setSavedAssistantMessages(new Set());
    
    // Отмечаем все сообщения из initialMessages как уже сохраненные
    const initialAssistantIds = initialMessages
      .filter(m => m.role === 'assistant')
      .map(m => m.id);
    setSavedAssistantMessages(new Set(initialAssistantIds));
    
    // Отмечаем что компонент инициализирован
    setHasInitialized(true);
  }, [threadId, initialMessages]);

  const sendMessage = useMutation<typeof api.messages.send>(api.messages.send);
  const patchContent = useMutation(api.messages.patchContent);
  const hasKeys = useMemo(() => hasRequiredKeys(), [hasRequiredKeys]);
  const debouncedPatch = useDebouncedCallback(
    (id: Id<'messages'>, content: string, version: number) => {
      patchContent({ messageId: id, content, version }).catch((err) => {
        console.error('patchContent failed', err);
      });
    },
    1000
  );

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [savedAssistantMessages, setSavedAssistantMessages] = useState<Set<string>>(new Set());
  const { versions: messageVersions, updateVersion } = useMessageVersionStore();

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

  // Функция для скролла к сообщению
  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

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
      // onFinish больше не используется для сохранения - это делается в useEffect
    },
  });

  // Очищаем поле ввода, цитаты и вложения при смене треда
  useEffect(() => {
    setInput('');
    clearQuote();
    clearAttachments();
  }, [threadId, setInput, clearQuote, clearAttachments]);

  // При первом открытии пустого чата (`/chat`) сбрасываем возможные старые сообщения из предыдущих сессий
  useEffect(() => {
    if (!isConvexId(threadId) && hasInitialized && initialMessages.length === 0) {
      // Сбрасываем сообщения только при первом заходе на пустой чат
      setMessages([]);
      setSavedAssistantMessages(new Set());
    }
  }, [threadId, hasInitialized, initialMessages.length, setMessages]);

  // Отслеживаем и сохраняем новые сообщения от ИИ
  useEffect(() => {
    if (!isConvexId(currentThreadId)) return;

    const assistantMessages = messages.filter(m => m.role === 'assistant');

    assistantMessages.forEach(async (message) => {
      if (!savedAssistantMessages.has(message.id)) {
        if (!isConvexId(message.id)) {
          try {
            const dbId = await sendMessage({
              threadId: currentThreadId as Id<'threads'>,
              role: 'assistant',
              content: message.content,
            });

            setSavedAssistantMessages(prev => new Set(prev).add(dbId));

            setMessages(prev =>
              prev.map(m =>
                m.id === message.id ? { ...m, id: dbId } : m
              )
            );
          } catch (error) {
            console.error('Failed to save assistant message:', error);
          }
        } else {
          setSavedAssistantMessages(prev => new Set(prev).add(message.id));
        }
      }
    });
  }, [messages, currentThreadId, savedAssistantMessages, sendMessage, setMessages]);

  // Инкрементальное сохранение последнего сообщения ассистента
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || status !== 'streaming') return;
    if (!isConvexId(last.id)) return;

    const currentVersion = messageVersions[last.id] ?? 0;
    const newVersion = currentVersion + 1;
    debouncedPatch(last.id as Id<'messages'>, last.content, newVersion);
    updateVersion(last.id, newVersion);
  }, [messages, status, debouncedPatch, messageVersions, updateVersion]);

  // Автопрокрутка чата при появлении новых сообщений
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Прокрутка в конец при первой загрузке
  useEffect(() => {
    scrollToBottom('auto');
  }, []);

  return (
    <div className="relative w-full min-h-screen flex flex-col">
      {messages.length === 0 ? (
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
            messageCount={messages.length}
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
              messages={messages}
              status={status}
              setMessages={setMessages}
              reload={reload}
              error={error}
              stop={stop}
            />
            <div ref={messagesEndRef} />
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
              messageCount={messages.length}
              error={error}
              onThreadCreated={setCurrentThreadId}
            />
          </div>
        </>
      )}
      
      {/* Chat Navigation Bars */}
      {messages.length > 0 && (
        <ChatNavigationBars messages={messages} scrollToMessage={scrollToMessage} />
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
            onClick={() => {
              if (window.location.pathname !== '/chat') {
                window.location.replace('/chat');
              }
            }}
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
