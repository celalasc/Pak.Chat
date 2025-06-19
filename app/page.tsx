'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { Button } from '@/frontend/components/ui/button';
import { getLastPath, isReload, saveLastPath } from '@/frontend/lib/lastChat';
import AppShellSkeleton from '@/frontend/components/AppShellSkeleton';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';

export default function Page() {
  const { user, loading, loginWithPopup } = useAuthStore();
  const router = useRouter();
  const { isMobile, mounted } = useIsMobile();
  // Начинаем с false для SSR совместимости
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
    // Обрабатываем перенаправления только после инициализации
    if (!isInitialized) return;

    // Если пользователь не авторизован, просто показываем страницу входа
    if (!user) {
      // Сохраняем что мы на странице входа
      saveLastPath('/');
      return;
    }

    // Пользователь авторизован - начинаем перенаправление
    setIsRedirecting(true);
    
    // Проверяем это перезагрузка или новый заход
    const isPageReload = isReload();
    const lastPath = getLastPath();
    
    if (isPageReload && lastPath) {
      // При перезагрузке возвращаем на последнюю страницу
      router.replace(lastPath);
    } else {
      // При новом заходе направляем на главную страницу
      if (isMobile) {
        router.replace('/home');
      } else {
        // Для ПК пока используем /chat как главную
        // TODO: создать отдельную главную страницу для ПК
        router.replace('/chat');
      }
    }
  }, [user, router, isMobile, isInitialized]);

  // Показываем загрузчик пока не инициализировано или идет перенаправление
  if (!isInitialized || isRedirecting) {
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
