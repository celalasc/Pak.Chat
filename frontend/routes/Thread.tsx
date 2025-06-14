import Chat from '@/frontend/components/Chat';
import { useParams } from 'react-router';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { UIMessage } from 'ai';

export default function Thread() {
  const { id } = useParams();
  if (!id) throw new Error('Thread ID is required');

  const threadId = id as Id<'threads'>;
  const { results, error: queryError } = usePaginatedQuery(
    api.messages.get,
    { threadId },
    { initialNumItems: 50, suspense: false }
  );

  if (queryError) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-red-500">Failed to load thread</p>
      </div>
    );
  }

  const uiMessages: UIMessage[] =
    results?.map(msg => ({
      id: msg._id,
      role: msg.role,
      content: msg.content,
      createdAt: new Date(msg.createdAt),
      parts: [{ type: 'text', text: msg.content }],
    })) || [];

  return <Chat key={id} threadId={threadId} initialMessages={uiMessages} />;
}
