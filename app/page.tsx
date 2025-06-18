'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { Button } from '@/frontend/components/ui/button';

export default function IndexPage() {
  const { user, loading, login } = useAuthStore();
  const router = useRouter();
  const { isMobile } = useIsMobile();

  useEffect(() => {
    if (!loading && user) {
      // ПК - сразу в чат, мобильные - в home с историей
      router.push(isMobile ? '/home' : '/chat');
    }
  }, [user, loading, router, isMobile]);

  if (loading || (!loading && user)) {
    // Показываем пустой div, чтобы избежать моргания контента при редиректе
    return <div className="w-full h-screen bg-background" />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Welcome to Pak.Chat</h1>
      <p className="text-lg text-muted-foreground">Your high-performance LLM application.</p>
      <Button size="lg" onClick={login} disabled={loading}>
        Sign In with Google to Continue
      </Button>
    </main>
  );
}
