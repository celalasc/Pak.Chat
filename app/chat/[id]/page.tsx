import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import Chat from '@/frontend/components/Chat';
import { notFound, redirect } from 'next/navigation';
import { isConvexId } from '@/lib/ids';
import { UIMessage } from 'ai';
import type { Id } from '@/convex/_generated/dataModel';

export const dynamic = 'force-dynamic';

export default async function ChatPage({ params }: { params: { id: string } }) {
  if (!isConvexId(params.id)) redirect('/chat');
  const thread = await fetchQuery(api.threads.list).then(ts => ts.find(t => t._id === params.id as Id<'threads'>));
  if (!thread) notFound();
  const messagesResult = await fetchQuery(api.messages.get, {
    threadId: params.id as Id<'threads'>,
  });
  const rawMessages = Array.isArray(messagesResult)
    ? messagesResult
    : messagesResult.page;
  const messages: UIMessage[] = rawMessages.map((m) => ({
    id: m._id,
    role: m.role,
    content: m.content,
    parts: [{ type: 'text', text: m.content }],
    createdAt: new Date(m.createdAt),
  }));
  return <Chat threadId={params.id} initialMessages={messages} />;
}
