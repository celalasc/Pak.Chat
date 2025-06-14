import Chat from '@/frontend/components/Chat';
import { useParams } from 'react-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { UIMessage } from 'ai';

export default function Thread() {
  const { id } = useParams();
  if (!id) throw new Error('Thread ID is required');

  const threadId = id as Id<'threads'>;
  const messages = useQuery(api.messages.get, { threadId });

  const uiMessages: UIMessage[] =
    messages?.map(msg => ({
      id: msg._id,
      role: msg.role,
      content: msg.content,
      createdAt: new Date(msg._creationTime),
      parts: [{ type: 'text', text: msg.content }],
    })) || [];

  return <Chat key={id} threadId={threadId} initialMessages={uiMessages} />;
}
