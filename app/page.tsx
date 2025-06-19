'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { Button } from '@/frontend/components/ui/button';
import { getLastChatId, getLastPath, isReload } from '@/frontend/lib/lastChat';
import AppShellSkeleton from '@/frontend/components/AppShellSkeleton';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';

export default function Page() {
  const { user, loading, login } = useAuthStore();
  const router = useRouter();
  const { isMobile, mounted } = useIsMobile();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Помечаем что компонент инициализирован
    if (!isInitialized && mounted && !loading) {
      setIsInitialized(true);
      
      // Если пользователь не авторизован, скрываем глобальный лоадер
      if (!user && typeof window !== 'undefined' && window.__hideGlobalLoader) {
        window.__hideGlobalLoader();
      }
    }
  }, [mounted, loading, isInitialized, user]);

  useEffect(() => {
    if (!isInitialized || loading) return;

    if (user && !isRedirecting) {
      console.log('User authenticated, starting redirect...');
      setIsRedirecting(true);
      
      const lastChatId = getLastChatId();
      const lastPath = getLastPath();
      
      // Если это перезагрузка и есть последний путь, переходим туда
      if (isReload() && lastPath && lastPath !== '/') {
        console.log('Redirecting to last path:', lastPath);
        router.replace(lastPath);
      }
      // Если есть последний чат, переходим к нему
      else if (lastChatId) {
        console.log('Redirecting to last chat:', lastChatId);
        router.replace(`/chat/${lastChatId}`);
      }
      // Иначе переходим на соответствующую главную страницу
      else {
        const targetPath = isMobile ? '/home' : '/chat';
        console.log('Redirecting to:', targetPath);
        router.replace(targetPath);
      }
    }
  }, [user, router, isInitialized, loading, isRedirecting, isMobile]);

  // Показываем скелет во время инициализации или загрузки
  if (loading || !isInitialized) {
    return <AppShellSkeleton />;
  }

  // Если пользователь авторизован, показываем скелет пока идет перенаправление
  if (user) {
    return <AppShellSkeleton />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Welcome to Pak.Chat</h1>
      <p className="text-lg text-muted-foreground">
        Your high-performance LLM application.
      </p>

      <Button size="lg" onClick={login} disabled={loading} className="mt-4">
        Sign In with Google to Continue
      </Button>
    </main>
  );
}

