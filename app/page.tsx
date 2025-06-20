'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { Button } from '@/frontend/components/ui/button';
import { getLastPath, isReload } from '@/frontend/lib/lastChat';
import AppShellSkeleton from '@/frontend/components/AppShellSkeleton';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';

export default function Page() {
  const { user, loading, loginWithPopup } = useAuthStore();
  const router = useRouter();
  const { isMobile, mounted } = useIsMobile();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (loading || !mounted) return;

    if (user && !hasRedirectedRef.current) {
      console.log('User authenticated, redirecting...');
      hasRedirectedRef.current = true;
      
      const lastPath = getLastPath();
      
      // Если это перезагрузка и есть последний путь, переходим туда
      if (isReload() && lastPath && lastPath !== '/') {
        console.log('Redirecting to last path:', lastPath);
        router.replace(lastPath);
      }      // Иначе всегда переходим на соответствующую главную страницу устройства
      else {
        const targetPath = isMobile ? '/home' : '/chat';
        console.log('Redirecting to main page for device type:', targetPath);
        router.replace(targetPath);
      }
    }

    // Если пользователь не авторизован, скрываем глобальный лоадер
    if (!user && !loading && typeof window !== 'undefined') {
      const globalWindow = window as typeof window & { __hideGlobalLoader?: () => void };
      globalWindow.__hideGlobalLoader?.();
    }
  }, [user, loading, mounted, router, isMobile]);

  // Отслеживаем изменения размера экрана для перенаправления на соответствующую страницу
  useEffect(() => {
    if (!user || loading || !mounted) return;
    
    const targetPath = isMobile ? '/home' : '/chat';
    const currentPath = window.location.pathname;
    
    // Только перенаправляем если мы действительно на другой странице и устройство изменилось
    if ((currentPath === '/home' && !isMobile) || (currentPath === '/chat' && isMobile)) {
      // Добавляем небольшую задержку чтобы избежать конфликтов с первоначальным перенаправлением
      const timeoutId = setTimeout(() => {
        console.log('Device type changed, redirecting to:', targetPath);
        router.replace(targetPath);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isMobile, user, loading, mounted, router]);

  // Сбрасываем флаг перенаправления если пользователь разлогинился
  useEffect(() => {
    if (!user && !loading) {
      hasRedirectedRef.current = false;
    }
  }, [user, loading]);

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

