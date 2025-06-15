import { UIMessage } from 'ai';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import KeyPrompt from '@/frontend/components/KeyPrompt';
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
    const PageSkeleton = require('../components/PageSkeleton').default;
    return <PageSkeleton />;
  }
  const hasKeys = hasRequiredKeys();
  const initialMessages = hasKeys ? [] : [welcomeMessage];
  
  // Используем Chat компонент с пустым threadId для новой беседы
  return (
    <>
      {!hasKeys && <KeyPrompt />}
      <Chat threadId="" initialMessages={initialMessages} />
    </>
  );
}
