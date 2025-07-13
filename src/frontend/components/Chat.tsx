"use client";

import { ChatHistoryButton } from './chat-history';
import NewChatButton from './NewChatButton';
import SettingsDrawer from './SettingsDrawer';
import MobileChatMenu from './mobile/MobileChatMenu';
import ChatView from './ChatView';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { WithTooltip } from './WithTooltip';
import { ArrowLeft, Settings } from 'lucide-react';
import { useScrollHide } from '@/frontend/hooks/useScrollHide';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { useKeyboardInsets } from '../hooks/useKeyboardInsets';
import { cn } from '@/lib/utils';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSettingsStore } from '@/frontend/stores/SettingsStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import type { UIMessage } from 'ai';
import { Doc } from '@/convex/_generated/dataModel';

interface ChatProps {
  threadId: string;
  thread: Doc<'threads'> | null | undefined;
  initialMessages: UIMessage[];
}

// Мемоизированный компонент Chat
const Chat = React.memo(function Chat({ threadId, thread, initialMessages }: ChatProps) {
  const { isMobile } = useIsMobile();
  const { selectedModel } = useModelStore();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const isHeaderVisible = useScrollHide<HTMLDivElement>({ threshold: 15, panelRef });
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { settings } = useSettingsStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState(threadId);

  useKeyboardInsets((h) => {
    document.documentElement.style.setProperty('--keyboard-inset-height', `${h}px`);
  });

  // Handle settings drawer open/close for mobile animation
  const handleSettingsOpenChange = useCallback((open: boolean) => {
    setIsSettingsOpen(open);
  }, []);

  // Обработчик создания нового треда
  const handleThreadCreated = useCallback((newThreadId: string) => {
    setCurrentThreadId(newThreadId);
  }, []);

  // Мемоизированные обработчики для предотвращения лишних ререндеров
  const handleGoHome = useCallback(() => {
    router.push('/home');
  }, [router]);

  const handleGoNewChat = useCallback(() => {
    router.push('/chat');
  }, [router]);

  const handleOpenSettings = useCallback(() => {
    handleSettingsOpenChange(true);
  }, [handleSettingsOpenChange]);

  // Отслеживаем изменения threadId
  useEffect(() => {
    setCurrentThreadId(threadId);
  }, [threadId]);

  // Track virtual keyboard visibility on mobile
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

  // Мемоизируем классы для мобильной версии
  const mobileBackButtonClasses = useMemo(() => cn(
    'fixed left-4 top-4 z-50 transition-all duration-300 ease-in-out',
    (!isHeaderVisible || isKeyboardVisible) && 'transform -translate-x-full opacity-0',
  ), [isHeaderVisible, isKeyboardVisible]);

  const mobileMenuButtonClasses = useMemo(() => cn(
    'fixed right-4 top-4 z-50 transition-all duration-300 ease-in-out',
    (!isHeaderVisible || isKeyboardVisible) && 'transform translate-x-[calc(100%+1rem)]',
  ), [isHeaderVisible, isKeyboardVisible]);

  // Мемоизируем основной класс контейнера
  const mainContainerClasses = useMemo(() => cn(
    "relative min-h-screen bg-background overflow-y-auto no-scrollbar main-content",
    isMobile && "mobile-fullscreen touch-target"
  ), [isMobile]);

  // Мемоизируем классы для позиционирования ChatInput
  const chatInputClasses = useMemo(() => cn(
    'fixed left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 transition-all duration-300 z-30',
    isMobile ? 'bottom-0' : (initialMessages.length > 0 ? 'bottom-0' : 'top-1/2 -translate-y-1/2'),
  ), [isMobile, initialMessages.length]);

  return (
    <div className={mainContainerClasses}>
      
      <div className="w-full min-h-screen flex flex-col overflow-hidden">
        {/* Header for new chat vs existing chat */}
        {isMobile ? (
        // МОБИЛЬНАЯ версия - только меню с тремя точками для существующих чатов
        <>
          {currentThreadId ? (
            // Existing chat - показываем стрелочку назад слева и меню справа
            <>
              <div className={mobileBackButtonClasses}>
                <WithTooltip label="Back to Home" side="bottom">
                  <Button
                    variant="ghost"
                    size="icon"
                      className="bg-background/60 backdrop-blur-xl border border-border/20 rounded-full h-9 w-9 shadow-lg touch-target"
                    onClick={handleGoHome}
                    aria-label="Back to home"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </WithTooltip>
              </div>
              <div className={mobileMenuButtonClasses}>
                <MobileChatMenu threadId={currentThreadId} />
              </div>
            </>
          ) : (
            // New chat - показываем кнопку назад
            <div className="fixed left-4 top-4 z-50">
              <WithTooltip label="Back to Home" side="bottom">
                <Button
                  variant="ghost"
                  size="icon"
                    className="bg-background/60 backdrop-blur-xl border border-border/20 rounded-full h-9 w-9 shadow-lg touch-target"
                  onClick={handleGoHome}
                  aria-label="Back to home"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </WithTooltip>
            </div>
          )}
        </>
      ) : (
        // ПК версия - всегда показываем заголовок и кнопки (как раньше)
        <>
          {/* Top-right control panel */}
          <div
            ref={panelRef}
            className="fixed right-4 top-4 z-50 flex gap-2 p-1 bg-background/60 backdrop-blur-md rounded-lg border border-border/20"
          >
            <NewChatButton className="backdrop-blur-sm" />
            <ChatHistoryButton className="backdrop-blur-sm" />
              <SettingsDrawer isOpen={isSettingsOpen} setIsOpen={handleSettingsOpenChange}>
              <WithTooltip label="Settings" side="bottom">
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-background/80 backdrop-blur-sm border-border/50"
                  aria-label="Open settings"
                    onClick={handleOpenSettings}
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </WithTooltip>
            </SettingsDrawer>
          </div>

          {/* Top-left logo */}
          <div className="fixed left-4 top-4 z-50">
            <span
              className="text-xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
              onClick={handleGoNewChat}
            >
              Pak.Chat
            </span>
          </div>
        </>
      )}

        {/* Core chat UI */}
        <ChatView
          key={threadId}
          threadId={threadId}
          thread={thread}
          initialMessages={initialMessages}
          showNavBars={settings.showNavBars}
          onThreadCreated={handleThreadCreated}
        />
      </div>
    </div>
  );
});

export default Chat;
