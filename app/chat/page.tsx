'use client'
import Chat from '@/frontend/components/Chat';
import { useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import AppShellSkeleton from '@/frontend/components/AppShellSkeleton';

export default function NewChatPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { isMobile, mounted } = useIsMobile();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  // Автоматическое переключение между версиями при изменении размера экрана
  useEffect(() => {
    if (mounted && isAuthenticated && isMobile) {
      router.push('/home');
    }
  }, [isMobile, mounted, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return <AppShellSkeleton />;
  }

  // Ключ "new-draft" гарантирует, что для нового чата всегда будет чистое состояние
  return (
    <Chat
      key="new-draft"
      threadId=""
      thread={null}
      initialMessages={[]}
      dialogVersion={1}
    />
  );
}
