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
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import { toast } from 'sonner';
import { Id } from '@/convex/_generated/dataModel';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import { useAttachmentsStore } from '@/frontend/stores/AttachmentsStore';
import { create } from 'zustand'; // Импортируем Zustand

// --- НАЧАЛО: Код для Zustand Store ---
// Мы определяем store прямо в этом файле, так как нельзя создать новый.
interface MessageVersionState {
  versions: Record<string, number>;
  updateVersion: (messageId: string, version: number) => void;
  reset: () => void;
}

export const useMessageVersionStore = create<MessageVersionState>((set) => ({
  versions: {},
  updateVersion: (messageId, version) =>
    set((state) => ({
      versions: { ...state.versions, [messageId]: version },
    })),
  reset: () => set({ versions: {} }),
}));
// --- КОНЕЦ: Код для Zustand Store ---


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
  const { clearQuote } = useQuoteStore();
  const { clear: clearAttachments } = useAttachmentsStore();
  
  useKeyboardInsets((h) => {
    document.documentElement.style.setProperty('--keyboard-inset-height', `${h}px`);
  });
  
  const [currentThreadId, setCurrentThreadId] = useState(threadId);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [savedAssistantMessages, setSavedAssistantMessages] = useState<Set<string>>(new Set());

  // Перенос навигации осуществляется из ChatInput
  
  // Используем наш store, определенный выше
  const updateVersion = useMessageVersionStore((s) => s.updateVersion);

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

  useQuoteShortcuts();

  // Отслеживание видимости клавиатуры на мобильных устройствах
  useEffect(() => {
    if (!isMobile) return;
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const heightDifference = windowHeight - viewportHeight;
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
      threadId: currentThreadId,
    },
    experimental_prepareRequestBody: ({ messages }) => {
      const messagesWithIds = messages.map(msg => ({ ...msg, id: msg.id }));
      return {
        messages: messagesWithIds,
        model: selectedModel,
        apiKeys: keys,
        threadId: currentThreadId,
      };
    },
    onFinish: async (message) => {
      // Логика здесь не нужна, все обрабатывается в useEffect
    },
  });
  
  // Синхронизация и сброс состояний
  useEffect(() => {
    setCurrentThreadId(threadId);
    setSavedAssistantMessages(new Set(initialMessages.filter(m => m.role === 'assistant').map(m => m.id)));
    setHasInitialized(true);
    setInput('');
    clearQuote();
    clearAttachments();
    // Сбрасываем версии при смене чата
    useMessageVersionStore.getState().reset(); 
  }, [threadId, initialMessages, setInput, clearQuote, clearAttachments]);


  // Сохранение ID нового сообщения от ассистента без рекурсивных обновлений
  useEffect(() => {
    const unsavedAssistantMessage = messages.find(
      (m) => m.role === 'assistant' && !isConvexId(m.id)
    );

    // Skip saving until we have a valid thread ID to avoid server errors
    if (unsavedAssistantMessage && isConvexId(currentThreadId)) {
      sendMessage({
        threadId: currentThreadId as Id<'threads'>,
        role: 'assistant',
        content: unsavedAssistantMessage.content,
      }).then((dbId) => {
        setMessages((prevMessages) =>
          prevMessages.map((m) =>
            m.id === unsavedAssistantMessage.id ? { ...m, id: dbId } : m
          )
        );
        setSavedAssistantMessages((prev) => new Set(prev).add(dbId));
      });
    }
  }, [messages, currentThreadId, sendMessage, setMessages]);

  // Инкрементальное сохранение с защитой от лишних вызовов
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant' && status === 'streaming' && isConvexId(last.id)) {
      const currentVersion = useMessageVersionStore.getState().versions[last.id] ?? 0;
      const newVersion = currentVersion + 1;
      debouncedPatch(last.id as Id<'messages'>, last.content, newVersion);
      updateVersion(last.id, newVersion);
    }
  }, [messages, status, debouncedPatch, updateVersion]);

  // Автопрокрутка
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    scrollToBottom('auto');
  }, []);

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
        {/* Верхние кнопки, навигация, логотип */}
        <div
          ref={panelRef}
          className={cn(
            "fixed right-4 top-4 z-20 flex gap-2 p-1 bg-background/60 backdrop-blur-md rounded-lg border border-border/20 transition-transform duration-300 ease-in-out",
            isMobile && (!isHeaderVisible || isKeyboardVisible) && "transform translate-x-[calc(100%-3rem)]"
          )}
        >
          {!keysLoading && hasKeys && <NewChatButton className="backdrop-blur-sm" />}
          <ChatHistoryButton className="backdrop-blur-sm" />
          <SettingsButton
            className={cn(
              "backdrop-blur-sm transition-opacity duration-300",
              isMobile && (!isHeaderVisible || isKeyboardVisible) && "opacity-0 pointer-events-none"
            )}
          />
        </div>
        {messages.length > 0 && <ChatNavigationBars messages={messages} scrollToMessage={scrollToMessage} />}
        <div className={cn("fixed left-4 top-4 z-20 transition-all duration-300 ease-in-out", isMobile && (!isHeaderVisible || isKeyboardVisible) && "transform -translate-x-full opacity-0")}>
            <div className="relative">
                {isMobile && <div className="absolute inset-0 -m-2 bg-background/60 backdrop-blur-md rounded-lg" />}
                <span className="relative text-xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer" onClick={() => { if (window.location.pathname !== '/chat') { window.location.replace('/chat'); }}}>
                    Pak.Chat
                </span>
            </div>
        </div>
        
        {/* Основная область */}
        <div className="flex-1 flex flex-col relative">
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
                    <div ref={messagesEndRef} />
                </main>
            </div>

            <div className={cn("absolute left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 transition-all duration-300", messages.length > 0 ? "bottom-0" : "top-1/2 -translate-y-1/2")}>
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