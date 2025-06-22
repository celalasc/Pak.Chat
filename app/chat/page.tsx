'use client'
import Chat from '@/frontend/components/Chat';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { saveLastPath } from '@/frontend/lib/lastChat';
import { useAuthStore } from '@/frontend/stores/AuthStore';

export default function NewChatPage() {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  
  // Уникальный ключ для принудительного пересоздания компонента при заходе на новый чат
  const [chatKey, setChatKey] = useState(() => `new-chat-${Date.now()}`);

  // Обновляем ключ при каждом переходе на /chat для очистки состояния
  useEffect(() => {
    if (pathname === '/chat') {
      setChatKey(`new-chat-${Date.now()}-${Math.random()}`);
    }
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);
  
  useEffect(() => {
    // Скрываем глобальный лоадер когда страница готова
    if (user && !loading) {
      if (typeof window !== 'undefined' && window.__hideGlobalLoader) {
        window.__hideGlobalLoader();
      }
      // Сохраняем текущий путь
      saveLastPath('/chat');
    }
  }, [user, loading]);

  if (loading || !user) {
    return <div className="w-full h-screen bg-background" />;
  }

  return (
    <Chat
      key={chatKey}
      threadId=""
      thread={null}
      initialMessages={[]}
    />
  );
}
