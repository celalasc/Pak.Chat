'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { Button } from '@/frontend/components/ui/button';
import { getLastPath, isReload } from '@/frontend/lib/lastChat';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';

export default function Page() {
  const { user, loading, loginWithPopup } = useAuthStore();
  const router = useRouter();
  const { isMobile, mounted } = useIsMobile();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (loading || !mounted) return;

    if (user && !hasRedirectedRef.current) {
      // User authenticated, redirecting...
      hasRedirectedRef.current = true;
      
      const lastPath = getLastPath();
      
      // Если это перезагрузка и есть последний путь, переходим туда
      if (isReload() && lastPath && lastPath !== '/') {
        // Redirecting to last path
        router.replace(lastPath);
      }      // Иначе всегда переходим на соответствующую главную страницу устройства
      else {
        const targetPath = isMobile ? '/home' : '/chat';
        // Redirecting to main page
        router.replace(targetPath);
      }
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
        // Device type changed, redirecting
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

  // Если пользователь авторизован, делаем перенаправление без показа скелета
  if (user) {
    return null; // Возвращаем null пока происходит перенаправление
  }

  // Показываем скелет только если не аутентифицирован и загружается
  if (loading || !mounted) {
    return null; // Убираем скелет для мгновенного перехода
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

