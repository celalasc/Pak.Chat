import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import Chat from '@/frontend/components/Chat';
import { notFound, redirect } from 'next/navigation';
import { isConvexId } from '@/lib/ids';
import { UIMessage } from 'ai';
import type { Id } from '@/convex/_generated/dataModel';

export const dynamic = 'force-dynamic';

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isConvexId(id)) redirect('/chat');
  const thread = await fetchQuery(api.threads.list).then(ts => ts.find(t => t._id === id as Id<'threads'>));
  if (!thread) notFound();
  const messagesResult = await fetchQuery(api.messages.get, {
    threadId: id as Id<'threads'>,
  });
  const rawMessages = Array.isArray(messagesResult)
    ? messagesResult
    : messagesResult.page;
  
  // Загружаем вложения для треда
  const attachments = await fetchQuery(api.attachments.byThread, {
    threadId: id as Id<'threads'>,
  });
  
  const messages: UIMessage[] = rawMessages.map((m) => {
    // Находим вложения для этого сообщения
    const messageAttachments = attachments.filter(a => a.messageId === m._id);
    
    return {
      id: m._id,
      role: m.role,
      content: m.content,
      parts: [{ type: 'text', text: m.content }],
      createdAt: new Date(m.createdAt),
      attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
    } as UIMessage & { attachments?: typeof messageAttachments };
  });
  return <Chat threadId={id} initialMessages={messages} />;
}
