import { Dispatch, SetStateAction, useState, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Check, Copy, RefreshCcw, SquarePen, GitBranch, ChevronLeft, ChevronRight } from 'lucide-react';
import { UIMessage } from 'ai';
import { UseChatHelpers } from '@ai-sdk/react';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import type { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from '@/frontend/stores/SettingsStore';

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
  const { selectedModel } = useModelStore();
  const { settings } = useSettingsStore();
  const canChat = hasRequiredKeys();
  const { isMobile } = useIsMobile();
  const removeAfter = useMutation(api.messages.removeAfter);
  const removeMessage = useMutation(api.messages.remove);
  const saveVersion = useMutation(api.messages.saveVersion);
  const saveAnswerVersion = useMutation(api.messages.saveAnswerVersion);
  const switchVersion = useMutation(api.messages.switchVersion);
  const cloneThread = useMutation(api.threads.clone);
  const thread = useQuery(
    api.threads.get,
    isConvexId(threadId) ? { threadId: threadId as Id<'threads'> } : 'skip'
  );
  
  // Получаем данные о сообщении для версий
  const messageData = useQuery(
    api.messages.getOne,
    isConvexId(message.id) ? { messageId: message.id as Id<'messages'> } : 'skip'
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
    // Stop any ongoing request.
    stop();

    if (!isConvexId(threadId)) {
      return;
    }

    // Only handle messages with valid Convex IDs to avoid validation errors
    if (!isConvexId(message.id)) {
      console.warn('Cannot regenerate message with non-Convex ID:', message.id);
      return;
    }

    try {
      if (message.role === 'user') {
        // Сохраняем текущую версию пользовательского сообщения, если включено сохранение регенераций
        if (settings.saveRegenerations && messageData) {
          await saveVersion({ messageId: message.id as Id<'messages'> });
        }

        // For user messages, remove all messages after this one and trigger reload
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
        // Для ассистентских сообщений ищем предыдущее пользовательское сообщение для сохранения версии
        const messagesSnapshot = Array.from(document.querySelectorAll('[id^="message-"]')).map(el => el.id.replace('message-', ''));
        const currentIndex = messagesSnapshot.findIndex((id) => id === message.id);

        let userMessageToVersionId: string | null = null;
        for (let i = currentIndex - 1; i >= 0; i--) {
          const prevMessageId = messagesSnapshot[i];
          const prevMessageEl = document.getElementById(`message-${prevMessageId}`);
          // Используем data-role, установленный на элементе сообщения, чтобы проверить роль автора
          if (prevMessageEl?.getAttribute('data-role') === 'user' && isConvexId(prevMessageId)) {
            userMessageToVersionId = prevMessageId;
            break;
          }
        }

        // For assistant messages, remove the message and all after it
        await removeAfter({
          threadId: threadId as Id<'threads'>,
          afterMessageId: message.id as Id<'messages'>,
        });
        await removeMessage({ messageId: message.id as Id<'messages'> });

        // Сохраняем предыдущий ответ ассистента как версию для пользовательского сообщения
        if (settings.saveRegenerations && userMessageToVersionId) {
          try {
            await saveAnswerVersion({
              userMessageId: userMessageToVersionId as Id<'messages'>,
              answerContent: content, // content of assistant answer being regenerated
              answerModel: (message as any).model ?? selectedModel ?? 'unknown',
            });
          } catch (error) {
            console.error('Failed to save assistant version', error);
          }
        }

        setMessages((messages) => {
          const index = messages.findIndex((m) => m.id === message.id);
          if (index !== -1) {
            return [...messages.slice(0, index)];
          }
          return messages;
        });
      }

      // Wait a bit to ensure the database operations complete before reloading
      setTimeout(() => {
        reload();
      }, 100);
    } catch (error) {
      console.error('Error during regeneration:', error);
    }
  }, [stop, threadId, message, settings.saveRegenerations, selectedModel, content, saveVersion, removeAfter, setMessages, removeMessage, saveAnswerVersion, reload, messageData]);

  const handleVersionSwitch = useCallback(async (direction: 'next' | 'prev') => {
    if (!isConvexId(message.id)) return;
    try {
      await switchVersion({ messageId: message.id as Id<'messages'>, direction });
      // Reload to fetch the updated version from the backend
      reload();
    } catch (error) {
      console.error('Error switching version:', error);
    }
  }, [message.id, reload, switchVersion]);

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
