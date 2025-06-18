'use client'
import Chat from '@/frontend/components/Chat';
import { useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NewChatPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  // Call the hook to init media query listeners; return values unused for now
  useIsMobile();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  // Убираем автоматическое перенаправление - пользователи должны иметь возможность заходить в чат с мобильных

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
