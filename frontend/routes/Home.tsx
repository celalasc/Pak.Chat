import { UIMessage } from 'ai';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import Chat from '@/frontend/components/Chat';
import { useLocation } from 'react-router';
import MessageLoading from '@/frontend/components/ui/MessageLoading';

export default function Home() {
  const { state } = useLocation();
  const eightDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 8);
  const welcomeMessage: UIMessage = {
    id: 'welcome',
    role: 'assistant' as const,
    parts: [{ type: 'text', text: 'To use Pak.chat, you need to enter your API keys.' }],
    content: 'To use Pak.chat, you need to enter your API keys.',
    createdAt: eightDaysAgo,
  };
  const { hasRequiredKeys, keysLoading } = useAPIKeyStore();

  // Render a loading indicator until the API keys are ready
  if (keysLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <MessageLoading />
      </div>
    );
  }
  const hasKeys = hasRequiredKeys();
  const initialMessages = hasKeys ? [] : [welcomeMessage];
  
  // Используем Chat компонент с пустым threadId для новой беседы
  return (
    <Chat
      key={state?.newChat ?? 'new'}
      threadId=""
      initialMessages={initialMessages}
    />
  );
}
