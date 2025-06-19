'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { Button } from '@/frontend/components/ui/button';
import { getLastChatId } from '@/frontend/lib/lastChat';
import { auth } from '@/firebase';

export default function IndexPage() {
  const { user, loading, loginWithPopup } = useAuthStore();
  const router = useRouter();
  const { isMobile, mounted } = useIsMobile();

  useEffect(() => {
    // Расширенное логирование для отладки
    console.log('🔍 Auth state:', { 
      loading, 
      user: !!user, 
      userEmail: user?.email,
      mounted,
      authInstance: !!auth,
      currentUser: auth?.currentUser?.email
    });
    
    // Ждем пока mounted станет true, чтобы избежать неправильного перенаправления
    if (!loading && user && mounted) {
      console.log('✅ User authenticated, redirecting...');
      
      // Проверяем, был ли переход на страницу именно перезагрузкой
      const navEntry =
        performance.getEntriesByType('navigation')[0] as
          | PerformanceNavigationTiming
          | undefined;
      const isReload = navEntry?.type === 'reload';
      if (isReload) {
        const lastId = getLastChatId();
        if (lastId) {
          console.log('📍 Redirecting to last chat:', lastId);
          router.push(`/chat/${lastId}`);
          return;
        }
      }
      // ПК - сразу в чат, мобильные - в home с историей
      const targetPath = isMobile ? '/home' : '/chat';
      console.log('📍 Redirecting to:', targetPath);
      router.push(targetPath);
    }
  }, [user, loading, router, isMobile, mounted]);

  if (loading || (!loading && user)) {
    // Показываем пустой div, чтобы избежать моргания контента при редиректе
    return <div className="w-full h-screen bg-background" />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Welcome to Pak.Chat</h1>
      <p className="text-lg text-muted-foreground">Your high-performance LLM application.</p>
      
      <Button 
        size="lg" 
        onClick={loginWithPopup} 
        disabled={loading}
        className="mt-4"
      >
        Sign In with Google to Continue
      </Button>
    </main>
  );
}
