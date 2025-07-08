import { useCompletion } from '@ai-sdk/react';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { toast } from 'sonner';

import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface MessageSummaryPayload {
  title: string;
  isTitle?: boolean;
  messageId: string;
  threadId: Id<'threads'>;
}

export const useMessageSummary = () => {
  const { getKey } = useAPIKeyStore();
  const renameThread = useMutation(api.threads.rename);

  const googleApiKey = getKey('google');

  const { complete, isLoading } = useCompletion({
    api: '/api/completion',
    headers: googleApiKey ? { 'X-Google-API-Key': googleApiKey } : undefined,
    onResponse: async (response) => {
      try {
        // Clone response so AI SDK can continue streaming without errors
        const payload: MessageSummaryPayload = await response
          .clone()
          .json();

        if (response.ok) {
          const { title, isTitle, threadId } = payload;

          if (isTitle) {
            await renameThread({ threadId, title });
          }
        } else {
          toast.error('Failed to generate a summary for the message');
        }
      } catch {
        /* ignore errors */
      }
    },
  });

  return {
    complete,
    isLoading,
  };
};
