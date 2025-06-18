"use client";

import ChatHistoryButton from './ChatHistoryButton';
import NewChatButton from './NewChatButton';
import SettingsButton from './SettingsButton';
import ChatView from './ChatView';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { WithTooltip } from './WithTooltip';
import { ArrowLeft } from 'lucide-react';
import { useScrollHide } from '@/frontend/hooks/useScrollHide';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { useKeyboardInsets } from '../hooks/useKeyboardInsets';
import { cn } from '@/lib/utils';
import React, { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '@/frontend/stores/SettingsStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import type { UIMessage } from 'ai';
import { Doc } from '@/convex/_generated/dataModel';

interface ChatProps {
  threadId: string;
  thread: Doc<'threads'> | null | undefined;
  initialMessages: UIMessage[];
  dialogVersion: number;
}

function Chat({ threadId, thread, initialMessages, dialogVersion }: ChatProps) {
  const { isMobile } = useIsMobile();
  const { selectedModel } = useModelStore();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const isHeaderVisible = useScrollHide<HTMLDivElement>({ threshold: 15, panelRef });
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { settings } = useSettingsStore();

  useKeyboardInsets((h) => {
    document.documentElement.style.setProperty('--keyboard-inset-height', `${h}px`);
  });

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

  return (
    <div className="w-full min-h-screen flex flex-col overflow-y-auto chat-smooth">
      {/* Header for new chat vs existing chat */}
      {isMobile ? (
        // МОБИЛЬНАЯ версия - плюсик везде
        <>
          {/* Top-right control panel - всегда показываем на мобильных */}
          <div
            ref={panelRef}
            className={cn(
              'fixed right-4 top-4 z-50 flex gap-2 p-1 bg-background/60 backdrop-blur-md rounded-lg border border-border/20 transition-transform duration-300 ease-in-out',
              (!isHeaderVisible || isKeyboardVisible) && 'transform translate-x-[calc(100%+1rem)]',
            )}
          >
            <NewChatButton className="backdrop-blur-sm" />
            {threadId && <ChatHistoryButton className="backdrop-blur-sm" />}
          </div>

          {threadId ? (
            // Existing chat - show logo
            <div
              className={cn(
                'fixed left-4 top-4 z-50 transition-all duration-300 ease-in-out',
                (!isHeaderVisible || isKeyboardVisible) && 'transform -translate-x-full opacity-0',
              )}
            >
              <div className="relative">
                <div className="absolute inset-0 -m-2 bg-background/60 backdrop-blur-md rounded-lg" />
                <span
                  className="relative text-xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                  onClick={() => router.push('/chat')}
                >
                  Pak.Chat
                </span>
              </div>
            </div>
          ) : (
            // New chat - show back button
            <div className="fixed left-4 top-4 z-50">
              <WithTooltip label="Back to Home" side="bottom">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/80 backdrop-blur-sm border-border/50"
                  onClick={() => router.push(isMobile ? '/home' : '/chat')}
                  aria-label="Back to home"
                >
                  <ArrowLeft className="h-5 w-5" />
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
            <SettingsButton className="backdrop-blur-sm" />
          </div>

          {/* Top-left logo */}
          <div className="fixed left-4 top-4 z-50">
            <span
              className="text-xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
              onClick={() => router.push('/chat')}
            >
              Pak.Chat
            </span>
          </div>
        </>
      )}

      {/* Core chat UI */}
      <ChatView
        key={`${threadId}-${dialogVersion}`}
        threadId={threadId}
        thread={thread}
        initialMessages={initialMessages}
        dialogVersion={dialogVersion}
        showNavBars={settings.showNavBars}
      />
    </div>
  );
}

export default React.memo(Chat);
