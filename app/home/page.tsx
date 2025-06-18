'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useConvexAuth } from 'convex/react';
import { Button } from '@/frontend/components/ui/button';
import { MessageSquare, Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import ChatHistoryList from '@/frontend/components/ChatHistoryList';
import SettingsDrawer from '@/frontend/components/SettingsDrawer';
import AppShellSkeleton from '@/frontend/components/AppShellSkeleton';
import { WithTooltip } from '@/frontend/components/WithTooltip';
import type { Doc, Id } from '@/convex/_generated/dataModel';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const { isMobile } = useIsMobile();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSelectThread = (threadId: Id<'threads'>) => {
    router.push(`/chat/${threadId}`);
  };

  const handleNewChat = () => {
    router.push('/chat');
  };

  if (isLoading || !isAuthenticated) {
    return <AppShellSkeleton />;
  }

  return (
    <div className="w-full min-h-screen flex flex-col overflow-hidden bg-background">
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

        {/* Right: Spacer to keep logo centered */}
        <div className="w-10" />
      </div>

      {/* Chat history list */}
      <div className="flex-1 min-h-0">
        <ChatHistoryList
          onSelectThread={handleSelectThread}
          onNewChat={handleNewChat}
          showSearch={true}
          className="h-full"
        />
      </div>

      {/* Floating Action Button for new chat (mobile) */}
      {isMobile && (
        <div className="fixed bottom-6 right-6 z-20">
          <WithTooltip label="New Chat" side="left">
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg"
              onClick={handleNewChat}
              aria-label="Start new chat"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </WithTooltip>
        </div>
      )}
    </div>
  );
} 