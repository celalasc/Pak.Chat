'use client'
import Chat from '@/frontend/components/Chat';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { saveLastPath } from '@/frontend/lib/lastChat';
import { useAuthStore } from '@/frontend/stores/AuthStore';

export default function NewChatPage() {
  const { user, loading } = useAuthStore();
  const router = useRouter();

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

  // Убираем автоматическое перенаправление для новых чатов
  // Мобильные пользователи тоже могут создавать новые чаты через /chat

  if (loading || !user) {
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
