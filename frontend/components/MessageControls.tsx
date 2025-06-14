import { Dispatch, SetStateAction, useState } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Check, Copy, RefreshCcw, SquarePen, GitBranch } from 'lucide-react';
import { UIMessage } from 'ai';
import { UseChatHelpers } from '@ai-sdk/react';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useNavigate } from 'react-router';

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
  const hasRequiredKeys = useAPIKeyStore((state) => state.hasRequiredKeys());
  const { isMobile } = useIsMobile();
  const removeAfter = useMutation(api.messages.removeAfter);
  const removeMessage = useMutation(api.messages.remove);
  const cloneThread = useMutation(api.threads.clone);
  const navigate = useNavigate();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleRegenerate = async () => {
    // stop the current request
    stop();

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
      {setMode && hasRequiredKeys && (
        <Button variant="ghost" size="icon" onClick={() => setMode('edit')}>
          <SquarePen className="w-4 h-4" />
        </Button>
      )}
      {hasRequiredKeys && (
        <Button
          variant="ghost"
          size="icon"
          onClick={async () => {
            const newId = await cloneThread({
              threadId: threadId as Id<'threads'>,
              title: 'New Branch',
            });
            navigate(`/chat/${newId}`);
            onToggleVisibility?.();
          }}
        >
          <GitBranch className="w-4 h-4" />
        </Button>
      )}
      {hasRequiredKeys && (
        <Button variant="ghost" size="icon" onClick={handleRegenerate}>
          <RefreshCcw className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
