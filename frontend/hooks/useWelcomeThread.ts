import { useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useRouter } from 'next/navigation';

export default function useWelcomeThread() {
  const router = useRouter();
  const { hasRequiredKeys } = useAPIKeyStore();

  const welcome = useQuery(api.threads.listSystem, {});
  const createThread = useMutation(api.threads.create);
  const sendMessage = useMutation(api.messages.send);

  useEffect(() => {
    if (hasRequiredKeys()) return;
    (async () => {
      let id = welcome?.[0]?._id;
      if (!id) {
        id = await createThread({ title: 'API Keys', system: true });
        await sendMessage({
          threadId: id,
          role: 'assistant',
          content: 'To use Pak.chat you need to enter your API keys.',
        });
      }
      router.replace(`/chat/${id}`);
    })();
  }, [welcome, hasRequiredKeys, createThread, sendMessage, router]);
}
