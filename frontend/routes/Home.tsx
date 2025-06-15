import { UIMessage } from 'ai';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import Chat from '@/frontend/components/Chat';

export default function Home() {
  const eightDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 8);
  const welcomeMessage: UIMessage = {
    id: 'welcome',
    role: 'assistant' as const,
    parts: [{ type: 'text', text: 'To use Pak.chat, you need to enter your API keys.' }],
    content: 'To use Pak.chat, you need to enter your API keys.',
    createdAt: eightDaysAgo,
  };
  const { hasRequiredKeys, keysLoading } = useAPIKeyStore();
  if (keysLoading) {
    return null;
  }
  const hasKeys = hasRequiredKeys();
  const initialMessages = hasKeys ? [] : [welcomeMessage];
  
  // Используем Chat компонент с пустым threadId для новой беседы
  return <Chat threadId="" initialMessages={initialMessages} />;
}
