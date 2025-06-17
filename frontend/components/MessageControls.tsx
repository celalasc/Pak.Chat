import { Dispatch, SetStateAction, useState, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Check, Copy, RefreshCcw, SquarePen, GitBranch, ChevronLeft, ChevronRight } from 'lucide-react';
import { UIMessage } from 'ai';
import { UseChatHelpers } from '@ai-sdk/react';
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
}: MessageControlsProps) {
  const [copied, setCopied] = useState(false);
  const { hasRequiredKeys, keys } = useAPIKeyStore();
  const { selectedModel } = useModelStore();
  const { settings } = useSettingsStore();
  const { isAuthenticated } = useConvexAuth();
  const canChat = hasRequiredKeys();
  const { isMobile } = useIsMobile();
  const prepareForRegenerate = useMutation(api.messages.prepareForRegeneration);
  const switchVersion = useMutation(api.messages.switchVersion);
  const cloneThread = useMutation(api.threads.clone);
  const thread = useQuery(
    api.threads.get,
    isConvexId(threadId) ? { threadId: threadId as Id<'threads'> } : 'skip'
  );
  
  // Получаем данные о сообщении для версий
  const messageData = useQuery(
    api.messages.getOne,
    isConvexId(message.id) && isAuthenticated
      ? { messageId: message.id as Id<'messages'> }
      : 'skip'
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
    navigator.clipboard.writeText(content);
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
    if (!isConvexId(parentMessageToResend.id)) {
      console.warn('Parent message for regeneration has a non-Convex ID:', parentMessageToResend.id);
      return;
    }

    try {
      const msgToResend = await prepareForRegenerate({
        threadId: threadId as Id<'threads'>,
        userMessageId: parentMessageToResend.id as Id<'messages'>,
      });

      if (msgToResend) {
        await append(
          { role: 'user', content: msgToResend.content },
          {
            body: {
              model: selectedModel,
              apiKeys: keys,
              threadId,
            },
          },
        );
      }
    } catch (error) {
      console.error('Error during regeneration:', error);
    }
  }, [stop, threadId, message.id, messages, append, prepareForRegenerate, selectedModel, keys]);

  const handleVersionSwitch = useCallback(async (direction: 'next' | 'prev') => {
    if (!isConvexId(message.id)) return;
    try {
      const updatedVersion = await switchVersion({ messageId: message.id as Id<'messages'>, direction });

      if (updatedVersion) {
        const userMessageIndex = messages.findIndex(m => m.id === message.id);
        if (userMessageIndex !== -1 && userMessageIndex + 1 < messages.length) {
          const assistantMessage = messages[userMessageIndex + 1];
          if (assistantMessage?.role === 'assistant') {
            setMessages(prevMessages => prevMessages.map(msg => {
              if (msg.id === assistantMessage.id) {
                return {
                  ...msg,
                  content: updatedVersion.content,
                  parts: [{ type: 'text' as const, text: updatedVersion.content }],
                  model: updatedVersion.model,
                };
              }
              return msg;
            }));
            return;
          }
        }
      }
      reload();
    } catch (error) {
      console.error('Error switching version:', error);
    }
  }, [message.id, reload, switchVersion, messages, setMessages]);

  // Show controls on mobile only when explicitly visible.
  const shouldShowControls = useMemo(() => (isMobile ? isVisible : true), [isMobile, isVisible]);

  // Memoize versioning info to avoid recomputation.
  const hasVersions = useMemo(() => !!messageData?.history && messageData.history.length > 0, [messageData]);
  const currentVersionIndex = useMemo(
    () => messageData?.activeHistoryIndex ?? (messageData?.history?.length ?? 1) - 1,
    [messageData]
  );
  const totalVersions = useMemo(() => messageData?.history?.length ?? 0, [messageData]);

  return (
    <div className="flex flex-col gap-2">
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
          <Button variant="ghost" size="icon" onClick={handleBranch}>
            <GitBranch className="w-4 h-4" />
          </Button>
        )}
        {canChat && (
          <Button variant="ghost" size="icon" onClick={handleRegenerate}>
            <RefreshCcw className="w-4 h-4" />
          </Button>
        )}
        {/* Отображение модели, сгенерировавшей ответ */}
        {message.role === 'assistant' && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground border select-none">
            {(message as any).model ?? '—'}
          </span>
        )}
      </div>
      
      {/* Навигация по версиям */}
      {message.role === 'user' && hasVersions && settings.saveRegenerations && (
        <div className={cn(
          'flex items-center gap-1 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 border',
          {
            'absolute mt-12 right-2': message.role === 'user',
            'opacity-0 group-hover:opacity-100': !isMobile,
            'opacity-100': isMobile,
          }
        )}>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => handleVersionSwitch('prev')}
            disabled={currentVersionIndex <= 0}
          >
            <ChevronLeft className="w-3 h-3" />
          </Button>
          <span className="text-xs font-medium min-w-[30px] text-center">
            {currentVersionIndex + 1}/{totalVersions}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => handleVersionSwitch('next')}
            disabled={currentVersionIndex >= totalVersions - 1}
          >
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
