import Chat from '@/frontend/components/Chat';
import { v4 as uuidv4 } from 'uuid';
import { UIMessage } from 'ai';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';

export default function Home() {
  const eightDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 8);
  const welcomeMessage: UIMessage = {
    id: 'welcome',
    role: 'assistant' as const,
    parts: [{ type: 'text', text: 'To use Pak.chat, you need to enter your API keys.' }],
    content: 'To use Pak.chat, you need to enter your API keys.',
    createdAt: eightDaysAgo,
  };
  const hasKeys = useAPIKeyStore(state => state.hasRequiredKeys());
  const initialMessages = hasKeys ? [] : [welcomeMessage];
  return <Chat threadId={uuidv4()} initialMessages={initialMessages} />;
}
