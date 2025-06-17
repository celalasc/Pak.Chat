"use client";

import ChatHistoryButton from './ChatHistoryButton';
import NewChatButton from './NewChatButton';
import SettingsButton from './SettingsButton';
import ChatView from './ChatView';
import { useRouter } from 'next/navigation';
import { useScrollHide } from '@/frontend/hooks/useScrollHide';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { useKeyboardInsets } from '../hooks/useKeyboardInsets';
import { cn } from '@/lib/utils';
import React, { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '@/frontend/stores/SettingsStore';
import type { UIMessage } from 'ai';

interface ChatProps {
  threadId: string;
  initialMessages: UIMessage[];
}

function Chat({ threadId, initialMessages }: ChatProps) {
  const { isMobile } = useIsMobile();
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
      {/* Top-right control panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed right-4 top-4 z-20 flex gap-2 p-1 bg-background/60 backdrop-blur-md rounded-lg border border-border/20 transition-transform duration-300 ease-in-out',
          isMobile && (!isHeaderVisible || isKeyboardVisible) && 'transform translate-x-[calc(100%+1rem)]',
        )}
      >
        <NewChatButton className="backdrop-blur-sm" />
        <ChatHistoryButton className="backdrop-blur-sm" />
        <SettingsButton
          className={cn(
            'backdrop-blur-sm transition-opacity duration-300',
            isMobile && (!isHeaderVisible || isKeyboardVisible) && 'opacity-0 pointer-events-none',
          )}
        />
      </div>

      {/* Top-left logo */}
      <div
        className={cn(
          'fixed left-4 top-4 z-20 transition-all duration-300 ease-in-out',
          isMobile && (!isHeaderVisible || isKeyboardVisible) && 'transform -translate-x-full opacity-0',
        )}
      >
        <div className="relative">
          {isMobile && <div className="absolute inset-0 -m-2 bg-background/60 backdrop-blur-md rounded-lg" />}
          <span
            className="relative text-xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
            onClick={() => router.push('/chat')}
          >
            Pak.Chat
          </span>
        </div>
      </div>

      {/* Core chat UI */}
      <ChatView
        threadId={threadId}
        initialMessages={initialMessages}
        showNavBars={settings.showNavBars}
      />
    </div>
  );
}

export default React.memo(Chat);
