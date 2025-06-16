'use client';

import { useParams, useLocation, Navigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import { useMemo } from 'react';
import Chat from '@/frontend/components/Chat';
import { Id, Doc } from '@/convex/_generated/dataModel';
import MessageLoading from '@/frontend/components/ui/MessageLoading';

export default function ChatPage() {
  const { id } = useParams();
  const location = useLocation();

  // ================================================================
  //                    CALL ALL HOOKS AT THE TOP
  // ================================================================
  const isValidId = useMemo(() => id && isConvexId(id), [id]);

  const thread = useQuery(api.threads.get, isValidId ? { threadId: id as Id<'threads'> } : 'skip');
  const messagesResult = useQuery(api.messages.get, isValidId ? { threadId: id as Id<'threads'> } : 'skip');
  const attachments = useQuery(api.attachments.byThread, isValidId ? { threadId: id as Id<'threads'> } : 'skip');

  // ================================================================
  //                    EARLY RETURNS AND VALIDATION
  // ================================================================
  if (id !== undefined && !isValidId) {
    return <Navigate to="/chat" replace />;
  }

  if (thread === undefined || messagesResult === undefined || attachments === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <MessageLoading />
      </div>
    );
  }

  if (thread === null) {
    return <Navigate to="/chat" replace />;
  }

  // ================================================================
  //                    MEMOIZE MESSAGES
  // ================================================================
  const messages = useMemo(() => {
    const attachmentsMap: Record<string, any[]> = {};
    if (attachments) {
      attachments.forEach((a) => {
        if (!a.messageId) return;
        if (!attachmentsMap[a.messageId]) attachmentsMap[a.messageId] = [];
        attachmentsMap[a.messageId].push(a);
      });
    }

    const rawMessages: Doc<'messages'>[] = Array.isArray(messagesResult)
      ? messagesResult
      : messagesResult?.page || [];

    return rawMessages.map((m) => ({
      id: m._id,
      role: m.role,
      content: m.content,
      createdAt: new Date(m._creationTime),
      parts: [{ type: 'text', text: m.content }],
      attachments: attachmentsMap[m._id] ?? [],
    }));
  }, [messagesResult, attachments]);

  // ================================================================
  //                        RENDER
  // ================================================================
  return <Chat threadId={id as string} initialMessages={messages} />;
}
