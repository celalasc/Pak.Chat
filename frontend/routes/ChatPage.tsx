'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { useQuery, useConvexAuth } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id, Doc } from '@/convex/_generated/dataModel'
import { isConvexId } from '@/lib/ids'
import Chat from '@/frontend/components/Chat'
import AppShellSkeleton from '@/frontend/components/AppShellSkeleton'

export default function ChatPage({ chatId }: { chatId: string }) {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()

  const isValidId = useMemo(() => isConvexId(chatId), [chatId])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/');
      return;
    }
    if (chatId && !isValidId) {
      router.replace('/chat');
      return;
    }
  }, [authLoading, isAuthenticated, chatId, isValidId, router]);

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

  useEffect(() => {
    // Если тред загрузился и его нет (null), редиректим
    if (thread === null) {
      router.replace('/chat');
    }
  }, [thread, router]);

  if (authLoading || !isValidId || thread === undefined || messagesResult === undefined || attachments === undefined) {
    return <AppShellSkeleton />;
  }

  if (thread === null) {
    return null; // Ждем редиректа
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
