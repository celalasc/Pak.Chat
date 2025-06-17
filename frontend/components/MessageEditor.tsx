// Dexie imports removed; operations will be handled via Convex
import { UseChatHelpers, useCompletion } from '@ai-sdk/react';
import { useState } from 'react';
import { UIMessage } from 'ai';
import { Dispatch, SetStateAction } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { isConvexId } from '@/lib/ids';
import { useSettingsStore } from '@/frontend/stores/SettingsStore';

export default function MessageEditor({
  threadId,
  message,
  content,
  setMessages,
  reload,
  setMode,
  stop,
}: {
  threadId: string;
  message: UIMessage;
  content: string;
  setMessages: UseChatHelpers['setMessages'];
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  reload: UseChatHelpers['reload'];
  stop: UseChatHelpers['stop'];
}) {
  const [draftContent, setDraftContent] = useState(content);
  const { getKey } = useAPIKeyStore();
  const { settings } = useSettingsStore();

  const { complete } = useCompletion({
    api: '/api/completion',
    ...(getKey('google') && {
      headers: { 'X-Google-API-Key': getKey('google')! },
    }),
    onResponse: async (response) => {
      try {
        const payload = await response.json();

        if (response.ok) {
          const { title } = payload;
          // TODO: save summary via Convex
        } else {
          toast.error(
            payload.error || 'Failed to generate a summary for the message'
          );
        }
      } catch {
        /* ignore errors */
      }
    },
  });

  const removeAfter = useMutation(api.messages.removeAfter);
  const editMessage = useMutation(api.messages.edit);
  const saveVersion = useMutation(api.messages.saveVersion);

  const handleSave = async () => {
    if (!isConvexId(threadId)) return;
    
    // Only handle messages with valid Convex IDs to avoid validation errors
    if (!isConvexId(message.id)) {
      console.warn('Cannot edit message with non-Convex ID:', message.id);
      toast.error('Cannot edit this message');
      return;
    }

    try {
      // Сохраняем текущую версию, если включено сохранение регенераций
      if (settings.saveRegenerations) {
        await saveVersion({ messageId: message.id as Id<'messages'> });
      }

      await removeAfter({
        threadId: threadId as Id<'threads'>,
        afterMessageId: message.id as Id<'messages'>,
      });

      await editMessage({
        messageId: message.id as Id<'messages'>,
        content: draftContent,
      });

      const updatedMessage = {
        ...message,
        content: draftContent,
        parts: [
          {
            type: 'text' as const,
            text: draftContent,
          },
        ],
        createdAt: new Date(),
      };

      setMessages((messages) => {
        const index = messages.findIndex((m) => m.id === message.id);

        if (index !== -1) {
          return [...messages.slice(0, index), updatedMessage];
        }

        return messages;
      });

      complete(draftContent, {
        body: {
          messageId: updatedMessage.id,
          threadId,
        },
      });
      setMode('view');

      // stop the current stream if any
      stop();

      setTimeout(() => {
        reload();
      }, 0);
    } catch (error) {
      console.error('Error during message edit:', error);
      toast.error('Failed to save changes');
    }
  };

  return (
    <div>
      <Textarea
        value={draftContent}
        onChange={(e) => setDraftContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
          }
        }}
      />
      <div className="flex gap-2 mt-2">
        <Button onClick={handleSave}>Save</Button>
        <Button onClick={() => setMode('view')}>Cancel</Button>
      </div>
    </div>
  );
}
