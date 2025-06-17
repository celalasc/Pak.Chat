import { Dispatch, SetStateAction, useState } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Check, Copy, RefreshCcw, SquarePen, GitBranch } from 'lucide-react';
import { UIMessage } from 'ai';
import { UseChatHelpers } from '@ai-sdk/react';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import type { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'next/navigation';

interface MessageControlsProps {
  threadId: string;
  message: UIMessage;
  setMessages: UseChatHelpers['setMessages'];
  content: string;
  setMode?: Dispatch<SetStateAction<'view' | 'edit'>>;
  reload: UseChatHelpers['reload'];
  stop: UseChatHelpers['stop'];
  isVisible?: boolean; // Для мобильных устройств
  onToggleVisibility?: () => void; // Для мобильных устройств
}

export default function MessageControls({
  threadId,
  message,
  setMessages,
  content,
  setMode,
  reload,
  stop,
  isVisible = false,
  onToggleVisibility,
}: MessageControlsProps) {
  const [copied, setCopied] = useState(false);
  const { hasRequiredKeys } = useAPIKeyStore();
  const canChat = hasRequiredKeys();
  const { isMobile } = useIsMobile();
  const removeAfter = useMutation<typeof api.messages.removeAfter>(
    api.messages.removeAfter
  );
  const removeMessage = useMutation<typeof api.messages.remove>(
    api.messages.remove
  );
  const cloneThread = useMutation<typeof api.threads.clone>(api.threads.clone);
  const thread = useQuery(
    api.threads.get,
    isConvexId(threadId) ? { threadId: threadId as Id<'threads'> } : 'skip'
  );
  const router = useRouter();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleRegenerate = async () => {
    // Проверяем, что сообщение сохранено в базе данных
    if (!isConvexId(message.id)) {
      console.warn("Cannot regenerate a message that has not been saved to the database yet.");
      return;
    }

    // stop the current request
    stop();

    if (!isConvexId(threadId)) {
      return;
    }

    if (message.role === 'user') {
      await removeAfter({
        threadId: threadId as Id<'threads'>,
        afterMessageId: message.id as Id<'messages'>,
      });

      setMessages((messages) => {
        const index = messages.findIndex((m) => m.id === message.id);

        if (index !== -1) {
          return [...messages.slice(0, index + 1)];
        }

        return messages;
      });
    } else {
      await removeAfter({
        threadId: threadId as Id<'threads'>,
        afterMessageId: message.id as Id<'messages'>,
      });
      await removeMessage({ messageId: message.id as Id<'messages'> });

      setMessages((messages) => {
        const index = messages.findIndex((m) => m.id === message.id);

        if (index !== -1) {
          return [...messages.slice(0, index)];
        }

        return messages;
      });
    }

    setTimeout(() => {
      reload();
    }, 0);
  };

  // На мобильных устройствах показываем кнопки только когда isVisible = true
  const shouldShowControls = isMobile ? isVisible : true;

  return (
    <div
      className={cn(
        'transition-opacity duration-100 flex gap-1',
        {
          'absolute mt-5 right-2': message.role === 'user',
          'opacity-0 group-hover:opacity-100': !isMobile && shouldShowControls,
          'opacity-100': isMobile && shouldShowControls,
          'opacity-0': isMobile && !shouldShowControls,
        }
      )}
    >
      <Button variant="ghost" size="icon" onClick={handleCopy}>
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>
      {setMode && canChat && (
        <Button variant="ghost" size="icon" onClick={() => setMode('edit')}>
          <SquarePen className="w-4 h-4" />
        </Button>
      )}
      {canChat && (
        <Button
          variant="ghost"
          size="icon"
          onClick={async () => {
            if (!isConvexId(threadId)) return;
            const title = thread?.title ?? message.content.slice(0, 30);
            const newId = await cloneThread({
              threadId: threadId as Id<'threads'>,
              title,
            });
            router.push(`/chat/${newId}`);
            onToggleVisibility?.();
          }}
        >
          <GitBranch className="w-4 h-4" />
        </Button>
      )}
      {canChat && (
        <Button variant="ghost" size="icon" onClick={handleRegenerate} disabled={!isConvexId(message.id)}>
          <RefreshCcw className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
