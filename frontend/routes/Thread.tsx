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
  let paginated;
  let queryError: unknown = null;
  try {
    paginated = usePaginatedQuery(
      api.messages.get,
      { threadId },
      { initialNumItems: 50 }
    );
  } catch (err) {
    queryError = err;
  }

  if (queryError) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-red-500">Failed to load thread</p>
      </div>
    );
  }

  const { results, status, loadMore } = paginated!;

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
