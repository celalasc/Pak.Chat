import Chat from '@/frontend/components/Chat';
import { useParams } from 'react-router';
// Dexie imports removed; messages will be loaded from server later
import { UIMessage } from 'ai';

export default function Thread() {
  const { id } = useParams();
  if (!id) throw new Error('Thread ID is required');

  const messages: UIMessage[] = [];

  return (
    <Chat key={id} threadId={id} initialMessages={messages} />
  );
}
