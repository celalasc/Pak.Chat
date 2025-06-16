import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import Chat from '@/frontend/components/Chat';
import { useSearchParams } from 'next/navigation';
import MessageLoading from '@/frontend/components/ui/MessageLoading';
import useWelcomeThread from '@/frontend/hooks/useWelcomeThread';

export default function Home() {
  useWelcomeThread();
  const searchParams = useSearchParams();
  const { keysLoading } = useAPIKeyStore();

  // Render a loading indicator until the API keys are ready
  if (keysLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <MessageLoading />
      </div>
    );
  }
  return (
    <Chat
      key={searchParams.get('newChat') ?? 'new'}
      threadId=""
      initialMessages={[]}
    />
  );
}
