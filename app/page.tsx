'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { Button } from '@/frontend/components/ui/button';
import { getLastChatId, getLastPath, isReload } from '@/frontend/lib/lastChat';
import AppShellSkeleton from '@/frontend/components/AppShellSkeleton';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';

export default function Page() {
  const { user, loading, loginWithPopup } = useAuthStore();
  const router = useRouter();
  const { isMobile, mounted } = useIsMobile();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (loading || !mounted) return;

    if (user && !hasRedirected) {
      console.log('User authenticated, redirecting...');
      setHasRedirected(true);
      
      const lastChatId = getLastChatId();
      const lastPath = getLastPath();
      
      // Если это перезагрузка и есть последний путь, переходим туда
      if (isReload() && lastPath && lastPath !== '/') {
        console.log('Redirecting to last path:', lastPath);
        router.replace(lastPath);
      }
      // Если это именно перезагрузка и есть последний чат, переходим к нему
      else if (isReload() && lastChatId) {
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

    // Если пользователь не авторизован, скрываем глобальный лоадер
    if (!user && !loading && typeof window !== 'undefined') {
      const globalWindow = window as typeof window & { __hideGlobalLoader?: () => void };
      globalWindow.__hideGlobalLoader?.();
    }
  }, [user, loading, mounted, hasRedirected, router, isMobile]);

  // Показываем скелет во время загрузки
  if (loading || !mounted) {
    return <AppShellSkeleton />;
  }

  // Если пользователь авторизован, показываем скелет
  if (user) {
    return <AppShellSkeleton />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Welcome to Pak.Chat</h1>
      <p className="text-lg text-muted-foreground">
        Your high-performance LLM application.
      </p>

      <Button size="lg" onClick={loginWithPopup} disabled={loading} className="mt-4">
        Sign In with Google to Continue
      </Button>
    </main>
  );
}

