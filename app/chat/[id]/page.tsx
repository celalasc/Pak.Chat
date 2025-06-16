"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { isConvexId } from '@/lib/ids';
import Chat from '@/frontend/components/Chat';
import AppShellSkeleton from '@/frontend/components/AppShellSkeleton';

export default function ChatWithIdPage({ params }: { params: { id: string } }) {
  const chatId = params.id;
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const isValidId = useMemo(() => isConvexId(chatId), [chatId]);

  // ЕДИНЫЙ useEffect для всей логики редиректа.
  // Это предотвращает гонки состояний и лишние перерисовки.
  useEffect(() => {
    // Если загрузка аутентификации еще не завершена, ничего не делаем
    if (authLoading) return;

    // Если пользователь не авторизован, отправляем на главную
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }

    // Если ID чата в URL невалидный, отправляем на создание нового чата
    if (!isValidId) {
      router.replace('/chat');
      return;
    }
  }, [authLoading, isAuthenticated, isValidId, router, chatId]);

  // Запросы к Convex. 'skip' используется, если ID невалидный, чтобы избежать ошибок.
  const thread = useQuery(
    api.threads.get,
    isValidId ? { threadId: chatId as Id<'threads'> } : 'skip'
  );

  const messagesResult = useQuery(
    api.messages.get,
    isValidId ? { threadId: chatId as Id<'threads'> } : 'skip'
  );

  const attachments = useQuery(
    api.attachments.byThread,
    isValidId ? { threadId: chatId as Id<'threads'> } : 'skip'
  );
  
  // Если тред загрузился и его нет (null) - значит, чат не найден или нет доступа.
  // Этот useEffect сработает только один раз, когда thread изменится с undefined на null.
  useEffect(() => {
    if (thread === null) {
      router.replace('/chat');
    }
  }, [thread, router]);


  const isLoading = authLoading || thread === undefined || messagesResult === undefined || attachments === undefined;
  
  // Если есть любая загрузка, или ID невалидный - показываем скелетон.
  if (isLoading || !isValidId) {
    return <AppShellSkeleton />;
  }

  // Если thread равен null, значит сейчас произойдет редирект, не рендерим ничего, чтобы избежать ошибок.
  if (thread === null) {
    return null;
  }

  const messages = useMemo(() => {
    const attachmentsMap: Record<string, any[]> = {}
    attachments?.forEach(a => {
      if (!a.messageId) return
      if (!attachmentsMap[a.messageId]) attachmentsMap[a.messageId] = []
      attachmentsMap[a.messageId].push(a)
    })

    const rawMessages: Doc<'messages'>[] = Array.isArray(messagesResult)
      ? messagesResult
      : messagesResult?.page || []

    return rawMessages.map(m => ({
      id: m._id,
      role: m.role,
      content: m.content,
      createdAt: new Date(m._creationTime),
      parts: [{ type: 'text' as const, text: m.content }],
      attachments: attachmentsMap[m._id] ?? []
    }))
  }, [messagesResult, attachments])

  return (
    <Chat
      key={chatId}
      threadId={chatId}
      initialMessages={messages}
    />
  )
}
