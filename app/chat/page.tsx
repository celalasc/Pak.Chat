'use client'
import Chat from '@/frontend/components/Chat';
import { useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { saveLastPath } from '@/frontend/lib/lastChat';

export default function NewChatPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { isMobile, mounted } = useIsMobile();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);
  
  useEffect(() => {
    // Скрываем глобальный лоадер когда страница готова
    if (isAuthenticated && !isLoading) {
      if (typeof window !== 'undefined' && window.__hideGlobalLoader) {
        window.__hideGlobalLoader();
      }
      // Сохраняем текущий путь
      saveLastPath('/chat');
    }
  }, [isAuthenticated, isLoading]);

  // Автоматическое перенаправление при изменении типа устройства
  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    
    // Если устройство стало мобильным, перенаправляем на мобильную версию
    if (isMobile) {
      router.replace('/home');
    }
  }, [isMobile, mounted, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return <div className="w-full h-screen bg-background" />;
  }

  // Ключ "new-draft" гарантирует, что для нового чата всегда будет чистое состояние
  return (
    <Chat
      key="new-draft"
      threadId=""
      thread={null}
      initialMessages={[]}
    />
  );
}
