import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import Chat from '@/frontend/components/Chat';
import { useDraftStore } from '@/frontend/stores/DraftStore';
import MessageLoading from '@/frontend/components/ui/MessageLoading';
import useWelcomeThread from '@/frontend/hooks/useWelcomeThread';

export default function Home() {
  useWelcomeThread();
  const draftKey = useDraftStore(s => s.draftKey);
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
      key={`draft-${draftKey}`}
      threadId=""
      initialMessages={[]}
    />
  );
}
