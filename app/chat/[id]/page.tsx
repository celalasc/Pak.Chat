import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import Chat from '@/frontend/components/Chat';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ChatPage({ params }: { params: { id: string } }) {
  const thread = await fetchQuery(api.threads.list).then(ts => ts.find(t => t._id === params.id));
  if (!thread) notFound();
  const messages = await fetchQuery(api.messages.get, { threadId: params.id });
  return <Chat threadId={params.id} initialMessages={messages} />;
}
