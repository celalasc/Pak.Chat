'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useConvexAuth } from 'convex/react';
import { Button } from '@/frontend/components/ui/button';
import { MessageSquare, Plus, Settings, Search } from 'lucide-react';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import ChatHistoryList from '@/frontend/components/ChatHistoryList';
import SettingsDrawer from '@/frontend/components/SettingsDrawer';
import MobileSearch from '@/frontend/components/MobileSearch';
import AppShellSkeleton from '@/frontend/components/AppShellSkeleton';
import { WithTooltip } from '@/frontend/components/WithTooltip';
import type { Id } from '@/convex/_generated/dataModel';
import { saveLastPath } from '@/frontend/lib/lastChat';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const { isMobile, mounted } = useIsMobile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  // Автоматическое перенаправление при изменении типа устройства
  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    
    // Если устройство перестало быть мобильным, перенаправляем на десктопную версию
    if (!isMobile) {
      router.replace('/chat');
    }
  }, [isMobile, mounted, isAuthenticated, router]);

  const handleSelectThread = (threadId: Id<'threads'>) => {
    router.push(`/chat/${threadId}`);
  };

  const handleNewChat = () => {
    router.push('/chat');
  };

  useEffect(() => {
    // Скрываем глобальный лоадер когда страница готова
    if (mounted && isAuthenticated && !isLoading) {
      if (typeof window !== 'undefined' && window.__hideGlobalLoader) {
        window.__hideGlobalLoader();
      }
      // Сохраняем текущий путь
      saveLastPath('/home');
    }
  }, [mounted, isAuthenticated, isLoading]);

  if (isLoading || !isAuthenticated) {
    return <AppShellSkeleton />;
  }

  return (
    <div className="w-full min-h-screen flex flex-col overflow-y-auto bg-background main-content">
      {/* Header with logo and settings */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        {/* Left: Settings button */}
        <SettingsDrawer isOpen={settingsOpen} setIsOpen={setSettingsOpen}>
          <WithTooltip label="Settings" side="bottom">
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/80 backdrop-blur-sm border-border/50"
              aria-label="Open settings"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </WithTooltip>
        </SettingsDrawer>

        {/* Center: Logo/Title */}
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-foreground">Pak.Chat</span>
        </div>

        {/* Right: Search button (mobile only) */}
        {isMobile ? (
          <WithTooltip label="Search" side="bottom">
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/80 backdrop-blur-sm border-border/50"
              aria-label="Search chats"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
          </WithTooltip>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Chat history list */}
      <div className="flex-1 min-h-0">
        <ChatHistoryList
          onSelectThread={handleSelectThread}
          onNewChat={handleNewChat}
          showSearch={!isMobile}
          className="h-full"
        />
      </div>

      {/* Floating Action Button for new chat (mobile) */}
      {isMobile && (
        <div className="fixed bottom-6 right-6 z-20">
          <WithTooltip label="New Chat" side="left">
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg floating-action-button"
              onClick={handleNewChat}
              onTouchStart={(e) => {
                // Предотвращаем конфликты с системными жестами
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onTouchEnd={(e) => {
                // Возвращаем исходный размер
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onTouchCancel={(e) => {
                // Возвращаем исходный размер при отмене
                e.currentTarget.style.transform = 'scale(1)';
              }}
              style={{
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                transition: 'transform 0.1s ease',
              }}
              aria-label="Start new chat"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </WithTooltip>
        </div>
      )}

      {/* Mobile Search */}
      {isMobile && (
        <MobileSearch 
          isOpen={searchOpen} 
          onClose={() => setSearchOpen(false)} 
        />
      )}
    </div>
  );
} 