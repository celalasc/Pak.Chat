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
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import { toast } from 'sonner';
import { Id } from '@/convex/_generated/dataModel';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import { useAttachmentsStore } from '@/frontend/stores/AttachmentsStore';

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
  const hasKeys = useMemo(() => hasRequiredKeys(), [hasRequiredKeys]);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [savedAssistantMessages, setSavedAssistantMessages] = useState<Set<string>>(new Set());

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
    if (!isConvexId(currentThreadId) || status === 'streaming') return;

    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    assistantMessages.forEach(async (message) => {
      // Проверяем, что сообщение еще не сохранено и имеет временный ID
      // Также проверяем, что это не сообщение из initialMessages (которое уже в БД)
      if (!savedAssistantMessages.has(message.id) && 
          !isConvexId(message.id) && 
          message.content.trim() &&
          !initialMessages.some(initial => initial.id === message.id)) {
        
        try {
          const dbId = await sendMessage({
            threadId: currentThreadId as Id<'threads'>,
            role: 'assistant',
            content: message.content,
          });

          // Отмечаем сообщение как сохраненное
          setSavedAssistantMessages(prev => new Set(prev).add(message.id));

          // Обновляем ID сообщения на реальный ID из базы данных
          setMessages(prev =>
            prev.map(m =>
              m.id === message.id ? { ...m, id: dbId } : m
            )
          );
        } catch (error) {
          console.error('Failed to save assistant message:', error);
        }
      }
    });
  }, [messages, currentThreadId, savedAssistantMessages, sendMessage, setMessages, status, initialMessages]);

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      {/* Верхние кнопки (New Chat, History, Settings) */}
      <div
        ref={panelRef}
        className={cn(
          "fixed right-4 top-4 z-20 flex gap-2 p-1 bg-background/60 backdrop-blur-md rounded-lg border border-border/20 transition-transform duration-300 ease-in-out",
          isMobile && (!isHeaderVisible || isKeyboardVisible) &&
            "transform translate-x-[calc(100%-3rem)]"
        )}
      >
        {!keysLoading && hasKeys && (
          <NewChatButton className="backdrop-blur-sm" />
        )}
        <ChatHistoryButton className="backdrop-blur-sm" />
        <SettingsButton
          className={cn(
            "backdrop-blur-sm transition-opacity duration-300",
            isMobile && (!isHeaderVisible || isKeyboardVisible) &&
              "opacity-0 pointer-events-none"
          )}
        />
      </div>

      {/* Навигационные полоски слева */}
      {messages.length > 0 && (
        <ChatNavigationBars
          messages={messages}
          scrollToMessage={scrollToMessage}
        />
      )}

      {/* Логотип */}
      <div
        className={cn(
          "fixed left-4 top-4 z-20 transition-all duration-300 ease-in-out",
          isMobile && (!isHeaderVisible || isKeyboardVisible) &&
            "transform -translate-x-full opacity-0"
        )}
      >
        <div className="relative">
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

      {/* Основная область, которая содержит и сообщения, и поле ввода */}
      <div className="flex-1 flex flex-col relative">
        {/* Скролл-область для сообщений */}
        <div className="flex-1 overflow-y-auto" id="messages-scroll-area">
          <main className="w-full max-w-3xl mx-auto pt-24 pb-44 px-4">
            {messages.length > 0 && (
              <Messages
                threadId={currentThreadId}
                messages={messages}
                status={status}
                setMessages={setMessages}
                reload={reload}
                error={error}
                stop={stop}
              />
            )}
            {/* "Якорь" для автопрокрутки. */}
            <div ref={messagesEndRef} />
          </main>
        </div>

        {/* Поле ввода */}
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 w-full max-w-3xl px-4",
            messages.length > 0
              ? "bottom-0"
              : "top-1/2 -translate-y-1/2"
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
            messageCount={messages.length}
            error={error}
            onThreadCreated={setCurrentThreadId}
          />
        </div>
      </div>
    </div>
  );
}
