import { Dispatch, SetStateAction, useState, useCallback, useMemo } from 'react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Check, Copy, RefreshCcw, SquarePen, GitBranch } from 'lucide-react';
import { UIMessage } from 'ai';
import { UseChatHelpers } from '@ai-sdk/react';
import { copyText } from '@/lib/copyText';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { useMutation, useQuery, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import type { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from '@/frontend/stores/SettingsStore';

interface MessageControlsProps {
  threadId: string;
  message: UIMessage;
  messages: UIMessage[];
  setMessages: UseChatHelpers['setMessages'];
  content: string;
  setMode?: Dispatch<SetStateAction<'view' | 'edit'>>;
  reload: UseChatHelpers['reload'];
  stop: UseChatHelpers['stop'];
  append: UseChatHelpers['append'];
  isVisible?: boolean; // Для мобильных устройств
  onToggleVisibility?: () => void; // Для мобильных устройств
  forceRegeneration: () => void; // Для сброса кэша AI SDK
}

export default function MessageControls({
  threadId,
  message,
  messages,
  setMessages,
  content,
  setMode,
  reload,
  stop,
  append,
  isVisible = false,
  onToggleVisibility,
  forceRegeneration,
}: MessageControlsProps) {
  const [copied, setCopied] = useState(false);
  const { hasRequiredKeys, keys } = useAPIKeyStore();
  const { selectedModel, webSearchEnabled } = useModelStore();
  const { isAuthenticated } = useConvexAuth();
  const canChat = hasRequiredKeys();
  const { isMobile } = useIsMobile();
  const prepareForRegenerate = useMutation(api.messages.prepareForRegeneration);
  const { settings } = useSettingsStore();
  const cloneThread = useMutation(api.threads.clone);
  const thread = useQuery(
    api.threads.get,
    isConvexId(threadId) ? { threadId: threadId as Id<'threads'> } : 'skip'
  );
  
  const router = useRouter();

  // Clone the current thread and navigate to the new one.
  const handleBranch = useCallback(async () => {
    if (!isConvexId(threadId)) return;
    const title = thread?.title ?? content.slice(0, 30);
    const newId = await cloneThread({
      threadId: threadId as Id<'threads'>,
      title,
    });
    router.push(`/chat/${newId}`);
    onToggleVisibility?.();
  }, [threadId, thread?.title, content, cloneThread, router, onToggleVisibility]);

  // Copy message contents to clipboard.
  const handleCopy = useCallback(() => {
    copyText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  // Regenerate the assistant answer starting from this message.
  const handleRegenerate = useCallback(async () => {
    stop();

    if (!isConvexId(threadId)) return;

    const currentIndex = messages.findIndex((m) => m.id === message.id);
    if (currentIndex === -1) {
      console.error('Could not find the current message in the messages array.');
      return;
    }

    let parentMessageIndex = -1;
    for (let i = currentIndex; i >= 0; i--) {
      if (messages[i].role === 'user') {
        parentMessageIndex = i;
        break;
      }
    }

    if (parentMessageIndex === -1) {
      console.error('Could not find a parent user message for regeneration.');
      return;
    }

    const parentMessageToResend = messages[parentMessageIndex];

    if (isConvexId(parentMessageToResend.id)) {
      try {
        await prepareForRegenerate({
          threadId: threadId as Id<'threads'>,
          userMessageId: parentMessageToResend.id as Id<'messages'>,
        });
      } catch (error) {
        console.error('Error during regeneration cleanup:', error);
      }
    }

    // ИСПРАВЛЕНИЕ: Принудительно очищаем состояние сообщений и устанавливаем флаг регенерации
    const messagesUpToParent = messages.slice(0, parentMessageIndex + 1);
    setMessages(messagesUpToParent);
    forceRegeneration();

    // Небольшая задержка чтобы UI обновился
    await new Promise(resolve => setTimeout(resolve, 50));

    // Используем текущую модель пользователя
    const { selectedModel: finalModelToUse, webSearchEnabled: currentSearch } = useModelStore.getState();
    
    reload({
      body: {
        model: finalModelToUse,
        apiKeys: keys,
        threadId,
        search: currentSearch,
      },
    });
  }, [stop, threadId, message.id, messages, setMessages, reload, prepareForRegenerate, keys, forceRegeneration]);

  // Show controls on mobile only when explicitly visible.
  const shouldShowControls = useMemo(() => (isMobile ? isVisible : true), [isMobile, isVisible]);

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'transition-opacity duration-100 flex items-center gap-1',
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
        {message.role === 'assistant' && canChat && (
          <Button variant="ghost" size="icon" onClick={handleBranch}>
            <GitBranch className="w-4 h-4" />
          </Button>
        )}
        {message.role === 'assistant' && canChat && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRegenerate}
          >
            <RefreshCcw className="w-4 h-4" />
          </Button>
        )}

        {/* Model label for assistant messages */}
        {message.role === 'assistant' && (message as any).model && (
          <span className="text-[10px] text-muted-foreground ml-2">
            {(message as any).model}
          </span>
        )}
      </div>
    </div>
  );
}
