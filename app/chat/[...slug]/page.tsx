'use client';

import { useRouter } from 'next/navigation';
import { use, useEffect, useMemo, useState } from 'react';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { isConvexId } from '@/lib/ids';
import Chat from '@/frontend/components/Chat';
import AppShellSkeleton from '@/frontend/components/AppShellSkeleton';

// Эта страница теперь ловит все адреса типа /chat/что-угодно
export default function CatchAllChatPage({ params }: { params: { slug: string[] } }) {
  const chatId = params.slug?.[0]; 
  
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const isValidId = useMemo(() => isConvexId(chatId), [chatId]);

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
  
  const messages = useMemo(() => {
    if (!attachments || !messagesResult) return []; // Защита от undefined

    const attachmentsMap: Record<string, any[]> = {}
    attachments.forEach(a => {
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
  }, [messagesResult, attachments]);

  useEffect(() => {
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
    }
  }, [authLoading, isAuthenticated, isValidId, router, chatId, thread]);
  
  const isLoading = authLoading || !isValidId || thread === undefined || messagesResult === undefined || attachments === undefined;

  useEffect(() => {
    if (!isLoading) {
      setIsInitialLoad(false);
    }
  }, [isLoading]);

  if (isInitialLoad) {
    return <AppShellSkeleton />;
  }

  if (thread === null) {
    return null;
  }

  return (
    <Chat
      key={chatId}
      threadId={chatId}
      initialMessages={messages}
    />
  )
}
