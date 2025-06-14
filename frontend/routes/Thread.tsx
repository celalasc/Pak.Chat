import Chat from '@/frontend/components/Chat';
import { useParams } from 'react-router';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { UIMessage } from 'ai';
import ErrorBoundary from '@/frontend/components/ErrorBoundary';

export default function Thread() {
  const { id } = useParams();
  if (!id) throw new Error('Thread ID is required');

  const threadId = id as Id<'threads'>;
  const { isAuthenticated } = useConvexAuth();
  
  const messagesResult = useQuery(
    api.messages.get,
    isAuthenticated ? { threadId } : "skip"
  );

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Please log in to view messages</p>
      </div>
    );
  }

  if (messagesResult === undefined) return null;

  // Handle both array and pagination result formats
  let messages: any[] = [];
  if (Array.isArray(messagesResult)) {
    messages = messagesResult;
  } else if (messagesResult && 'page' in messagesResult) {
    messages = messagesResult.page;
  }

  const uiMessages: UIMessage[] = messages.map(msg => ({
    id: msg._id,
    role: msg.role,
    content: msg.content,
    createdAt: new Date(msg.createdAt),
    parts: [{ type: 'text', text: msg.content }],
  }));

  return (
    <ErrorBoundary>
      <div className="fade-in">
        <Chat key={id} threadId={threadId} initialMessages={uiMessages} />
      </div>
    </ErrorBoundary>
  );
}
