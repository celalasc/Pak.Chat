'use client';

import { useRouter } from 'next/navigation';
import { Suspense, use, useEffect, useMemo, useState, useRef, memo, useCallback } from 'react';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { isConvexId } from '@/lib/ids';
import Chat from '@/frontend/components/Chat';
import ErrorBoundary from '@/frontend/components/ErrorBoundary';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { saveLastChatId, saveLastPath } from '@/frontend/lib/lastChat';
import type { UIMessage } from 'ai';

const CatchAllChatPageInner = memo(function CatchAllChatPageInner({ params }: { params: Promise<{ slug: string[] }> }) {
  const resolvedParams = use(params);
  const chatId = resolvedParams.slug?.[0];
  
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { isMobile, mounted } = useIsMobile();
  const wasMobileRef = useRef(isMobile);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Мемоизируем проверку валидности ID
  const isValidId = useMemo(() => isConvexId(chatId), [chatId]);

  // Используем агрегированный запрос для получения всех данных одновременно
  const chatPageData = useQuery(
    api.getChatPageData.getChatPageData,
    isValidId ? { threadId: chatId as Id<'threads'> } : 'skip'
  );

  // Извлекаем данные из агрегированного результата
  const thread = chatPageData?.thread;
  const messagesResult = chatPageData?.messages;
  const attachments = chatPageData?.attachments;

  const lastMessagesRef = useRef<UIMessage[]>([]);
  const savedLastChatRef = useRef<{ id?: string, path?: string }>({});

  // Мемоизируем обработку сообщений
  const messages = useMemo(() => {
    if (!attachments || !messagesResult) return lastMessagesRef.current;

    const attachmentsMap: Record<
      string,
      {
        id: Id<'attachments'>;
        messageId: Id<'messages'> | undefined;
        name: string;
        type: string;
        url: string | null;
      }[]
    > = {};

    attachments.forEach((a) => {
      if (!a.messageId) return;
      if (!attachmentsMap[a.messageId]) {
        attachmentsMap[a.messageId] = [];
      }
      attachmentsMap[a.messageId].push({
        id: a._id,
        messageId: a.messageId,
        name: a.name,
        type: a.type,
        url: a.url,
      });
    });

    // Handle case where the query might still be loading.
    const rawMessages: Doc<'messages'>[] = messagesResult ?? []

    const formatted = rawMessages.map(m => ({
      id: m._id,
      role: m.role,
      content: m.content,
      createdAt: new Date(m._creationTime),
      parts: [{ type: 'text' as const, text: m.content }],
      attachments: attachmentsMap[m._id] ?? [],
      model: m.model,
    }))

    lastMessagesRef.current = formatted
    return formatted
  }, [messagesResult, attachments]);

  // Мемоизируем обработчик навигации
  const handleNavigation = useCallback(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }
    if (!isValidId) {
      router.replace('/chat');
      return;
    }
    if (thread === null) {
      router.replace('/chat');
      return;
    }
    
    // Если чат успешно загружен, сохраняем его как последний
    if (thread && isValidId) {
      if (savedLastChatRef.current.id !== chatId) {
        saveLastChatId(chatId);
        savedLastChatRef.current.id = chatId;
      }
      const path = `/chat/${chatId}`;
      if (savedLastChatRef.current.path !== path) {
        saveLastPath(path);
        savedLastChatRef.current.path = path;
      }
    }
  }, [authLoading, isAuthenticated, isValidId, router, chatId, thread]);

  useEffect(() => {
    handleNavigation();
  }, [handleNavigation]);

  // Автоматическое перенаправление при изменении типа устройства
  useEffect(() => {
    if (!mounted || !isAuthenticated || !isValidId || !thread) return;

    // Перенаправляем на мобильную версию только, если ранее сайт был открыт на десктопе
    if (isMobile && !wasMobileRef.current) {
      if (savedLastChatRef.current.id !== chatId) {
        saveLastChatId(chatId);
        savedLastChatRef.current.id = chatId;
      }
      const path = `/chat/${chatId}`;
      if (savedLastChatRef.current.path !== path) {
        saveLastPath(path);
        savedLastChatRef.current.path = path;
      }
      router.replace('/home');
    }

    wasMobileRef.current = isMobile;
  }, [isMobile, mounted, isAuthenticated, isValidId, thread, chatId, router]);

  // Мемоизируем состояние загрузки
  const isLoading = useMemo(() =>
    authLoading ||
    !isValidId ||
    thread === undefined ||
    messagesResult === undefined ||
    attachments === undefined,
    [authLoading, isValidId, thread, messagesResult, attachments]
  );

  useEffect(() => {
    if (!isLoading) {
      setIsInitialLoad(false);
      // Скрываем глобальный лоадер когда страница готова
      if (typeof window !== 'undefined' && window.__hideGlobalLoader) {
        window.__hideGlobalLoader();
      }
    }
  }, [isLoading]);

  if (isInitialLoad) {
    return <div className="w-full h-screen bg-background" />;
  }

  if (thread === null) {
    // Thread не найден или нет доступа - показываем заглушку, перенаправление в useEffect
    return <div className="w-full h-screen bg-background" />;
  }

  return (
    <Chat
      key={chatId}
      threadId={chatId}
      thread={thread}
      initialMessages={messages}
    />
  )
});

export default function CatchAllChatPage({ params }: { params: Promise<{ slug: string[] }> }) {
  return (
    <ErrorBoundary fallbackRedirect="/chat">
      <Suspense fallback={null}>
        <CatchAllChatPageInner params={params} />
      </Suspense>
    </ErrorBoundary>
  );
}
