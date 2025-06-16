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
import { useRouter } from 'next/navigation';
import { useQuoteShortcuts } from '@/frontend/hooks/useQuoteShortcuts';
import { useScrollHide } from '@/frontend/hooks/useScrollHide';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { useKeyboardInsets } from '../hooks/useKeyboardInsets';
import { cn } from '@/lib/utils';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import { toast } from 'sonner';
import { Id } from '@/convex/_generated/dataModel';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import { useAttachmentsStore } from '@/frontend/stores/AttachmentsStore';
import { create } from 'zustand'; // Импортируем Zustand
import { useChatStore } from '@/frontend/stores/ChatStore';

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

function Chat({ threadId, initialMessages }: ChatProps) {
  const { keys, hasRequiredKeys, keysLoading } = useAPIKeyStore();
  const { selectedModel } = useModelStore();
  const { isMobile } = useIsMobile();
  const router = useRouter();
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
  // Перенос навигации осуществляется из ChatInput
  
  // Используем наш store, определенный выше
  const updateVersion = useMessageVersionStore((s) => s.updateVersion);

  const sendMessage = useMutation<typeof api.messages.send>(api.messages.send);
  const patchContent = useMutation(api.messages.patchContent);
  const finalizeMessage = useMutation(api.messages.finalize);
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
    onFinish: async (finalMsg) => {
      // Persist assistant message once generation is finished
      if (finalMsg.role === 'assistant' && !isConvexId(finalMsg.id)) {
        const realId = await sendMessage({
          threadId: currentThreadId as Id<'threads'>,
          role: 'assistant',
          content: finalMsg.content,
        });
        setMessages((prev) =>
          prev.map((m) => (m.id === finalMsg.id ? { ...m, id: realId } : m))
        );
      }
    },
  });

  const registerInputSetter = useChatStore((s) => s.registerInputSetter);
  useEffect(() => {
    registerInputSetter(setInput);
  }, [setInput, registerInputSetter]);
  
  // Синхронизация и сброс состояний
  useEffect(() => {
    // Этот эффект выполняется только при смене чата
    setCurrentThreadId(threadId);
    setHasInitialized(true);
    setInput('');
    clearQuote();
    clearAttachments();
    useMessageVersionStore.getState().reset();

    // Устанавливаем начальные сообщения для useChat
    setMessages(initialMessages);
  }, [threadId]);



  // Persist final assistant content to DB once generation is complete
  // Versions are incrementally patched while streaming.

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

  // After generation ends, flush pending patches
  useEffect(() => {
    // Status 'ready' means the assistant finished responding
    if (status === 'ready') {
      const last = messages[messages.length - 1];
      if (last?.role === 'assistant' && isConvexId(last.id)) {
        const currentVersion =
          useMessageVersionStore.getState().versions[last.id] ?? 0;
        patchContent({
          messageId: last.id as Id<'messages'>,
          content: last.content,
          version: currentVersion + 1,
        });
        finalizeMessage({ messageId: last.id as Id<'messages'> });
        useMessageVersionStore.getState().reset();
      }
    }
  }, [status, messages, patchContent, finalizeMessage]);

  return (
    <div className="w-full min-h-screen flex flex-col overflow-y-auto chat-smooth">
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
                <span
                  className="relative text-xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                  onClick={() => router.push(`/chat?newChat=${Date.now()}`)}
                >
                    Pak.Chat
                </span>
            </div>
        </div>
        
        {/* Основная область */}
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
                        error={error}
                        stop={stop}
                      />
                    )}
                    <div ref={messagesEndRef} />
                </main>
            </div>

            <div
              className={cn(
                "fixed left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 transition-all duration-300",
                messages.length > 0 ? "bottom-0" : "top-1/2 -translate-y-1/2"
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

export default React.memo(Chat);
