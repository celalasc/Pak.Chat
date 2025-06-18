'use client';

import { useRouter } from 'next/navigation';
import { use, useEffect, useMemo, useState } from 'react';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { isConvexId } from '@/lib/ids';
import Chat from '@/frontend/components/Chat';
import AppShellSkeleton from '@/frontend/components/AppShellSkeleton';

export default function CatchAllChatPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const resolvedParams = use(params);
  const chatId = resolvedParams.slug?.[0];
  
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

  const currentVersion = useQuery(
    api.messages.getCurrentDialogVersion,
    isValidId ? { threadId: chatId as Id<'threads'> } : 'skip'
  );
  
  const messages = useMemo(() => {
    if (!attachments || !messagesResult) return [];

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
      attachmentsMap[a.messageId].push(a);
    });

    // Handle case where the query might still be loading.
    const rawMessages: Doc<'messages'>[] = messagesResult ?? []

    return rawMessages.map(m => ({
      id: m._id,
      role: m.role,
      content: m.content,
      createdAt: new Date(m._creationTime),
      parts: [{ type: 'text' as const, text: m.content }],
      attachments: attachmentsMap[m._id] ?? [],
      model: m.model,
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
  
  const isLoading =
    authLoading ||
    !isValidId ||
    thread === undefined ||
    messagesResult === undefined ||
    attachments === undefined ||
    currentVersion === undefined;

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
      key={`${chatId}-${currentVersion}`}
      threadId={chatId}
      initialMessages={messages}
      dialogVersion={currentVersion as number}
    />
  )
}