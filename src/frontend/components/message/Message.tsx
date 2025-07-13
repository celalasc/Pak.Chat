import { memo, useState, useEffect, useMemo, useCallback } from 'react';
import MarkdownRenderer from '@/frontend/components/MemoizedMarkdown';
import { cn } from '@/lib/utils';
import { UIMessage } from 'ai';
import MessageControls from './MessageControls';
import { UseChatHelpers } from '@ai-sdk/react';
import MessageEditor from './MessageEditor';
import ErrorBoundary from '../ErrorBoundary';
import MessageReasoning from './MessageReasoning';
import SelectableText from '../SelectableText';
import QuotedMessage from './QuotedMessage';
import ImageModal from '../ImageModal';
import { Input } from '@/frontend/components/ui/input';
import { Button } from '@/frontend/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAPIKeyStore, type APIKeys } from '@/frontend/stores/APIKeyStore';
import { useChatStore } from '@/frontend/stores/ChatStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { useSettingsStore } from '@/frontend/stores/SettingsStore';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { useLongPress } from '@/frontend/hooks/useLongPress';
import { SearchIcon } from 'lucide-react';
import Image from 'next/image';
import AIImageGeneration from '../AIImageGeneration';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import type { Id } from '@/convex/_generated/dataModel';
import MobileMessageModal from './MobileMessageModal';

// Мемоизированный компонент Message
const PureMessage = memo(function PureMessage({
  threadId,
  message,
  setMessages,
  messages,
  reload,
  append,
  isStreaming,
  stop,
  forceRegeneration,
}: {
  threadId: string;
  message: UIMessage;
  setMessages: UseChatHelpers['setMessages'];
  messages: UIMessage[];
  reload: UseChatHelpers['reload'];
  append: UseChatHelpers['append'];
  isStreaming: boolean;
  stop: UseChatHelpers['stop'];
  forceRegeneration: () => void;
}) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [mobileControlsVisible, setMobileControlsVisible] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const isWelcome = message.id === 'welcome';
  const attachments = (message as any).attachments as { id: string; url: string; name: string; type: string; ext?: string; size?: number }[] | undefined;
  const imageGeneration = (message as any).imageGeneration;
  

  const [lightbox, setLightbox] = useState<{
    url: string;
    name: string;
    type: string;
    size?: number;
  } | null>(null);
  const { keys, setKeys } = useAPIKeyStore();
  const [localKeys, setLocalKeys] = useState<APIKeys>(keys);
  const { isMobile } = useIsMobile();
  const { setImageGenerationMode } = useChatStore();
  const { selectedModel, webSearchEnabled } = useModelStore();
  const { settings } = useSettingsStore();
  const cloneThread = useMutation(api.threads.clone);
  const prepareForRegenerate = useMutation(api.messages.prepareForRegeneration);
  const thread = useQuery(
    api.threads.get,
    isConvexId(threadId) ? { threadId: threadId as Id<'threads'> } : 'skip'
  );
  
  useEffect(() => { setLocalKeys(keys); }, [keys]);
  
  const saveKeys = useCallback(() => { 
    setKeys(localKeys); 
    toast.success('API keys saved'); 
  }, [setKeys, localKeys]);
  
  const router = useRouter();
  const { hasRequiredKeys } = useAPIKeyStore();
  const canChat = hasRequiredKeys();

  const handleNewChat = useCallback(() => {
    router.push(`/chat`);
  }, [router]);

  const { bind, isPressed } = useLongPress({
    onLongPress: () => {
      if (!isWelcome) { 
        setShowMobileModal(true);
      }
    },
    isMobile,
  });

  // Извлекаем reasoning из первой текстовой части с мемоизацией
  const reasoningData = useMemo(() => {
    const extractReasoning = (text: string) => {
      const openTag = text.indexOf('<think>');
      const closeTag = text.indexOf('</think>');
      
      if (openTag === -1) return null;
      
      const startIndex = openTag + 7;
      const endIndex = closeTag > -1 ? closeTag : text.length;
      const rawReasoning = text.slice(startIndex, endIndex);
      const cleanReasoning = rawReasoning.replace(/g:"([^"]*)"/g, '$1');
      
      return {
        reasoning: cleanReasoning,
        isComplete: closeTag > -1
      };
    };

    // Находим первую текстовую часть с рассуждениями
    for (const part of message.parts) {
      if (part.type === 'text' && (part as any).text?.includes('<think>')) {
        return extractReasoning((part as any).text);
      }
    }
    return null;
  }, [message.id, message.parts.length, message.parts.map(p => p.type === 'text' ? (p as any).text : '').join('')]);

  // Мемоизируем классы сообщения
  const messageClasses = useMemo(() => cn(
    'flex flex-col',
    message.role === 'user' ? 'items-end' : 'items-start'
  ), [message.role]);

  return (
    <>
    <div
      id={`message-${message.id}`}
      role="article"
      data-role={message.role}
      className={messageClasses}
    >
      {/*
       * Препроцессинг частей сообщения.
       * 1. Если в текстовой части присутствует блок <think>…</think>,
       *    выносим его в отдельную часть type='reasoning'.
       * 2. Аналогично обрабатываем вывод в формате g:"…" (строки DeepSeek).
       */}

       {/* Показываем reasoning отдельно если найден */}
      {reasoningData && reasoningData.reasoning.trim() && (
        <MessageReasoning
          key={`reasoning-${message.id}`}
          reasoning={reasoningData.reasoning}
          id={message.id}
          isComplete={reasoningData.isComplete}
        />
      )}

      {message.parts.map((part, index) => {
        const { type } = part;
        const key = `message-${message.id}-part-${index}`;

        if (type === 'text') {
          // Handle AI image generation
          if (message.role === 'assistant' && imageGeneration) {
            // Ensure format is present in params, fallback to 'png' if missing
            const paramsWithFormat = {
              ...imageGeneration.params,
              format: imageGeneration.params.format || 'png'
            };

            return (
              <div key={key} className="w-full px-2 sm:px-0">
                <AIImageGeneration
                  prompt={imageGeneration.prompt}
                  images={imageGeneration.images}
                  params={paramsWithFormat}
                  isGenerating={imageGeneration.isGenerating}
                  isStopped={imageGeneration.isStopped}
                  onRegenerate={async () => {
                    // Останавливаем текущий стрим
                    stop();

                    if (!isConvexId(threadId)) return;

                    // Находим текущее сообщение в массиве
                    const currentIndex = messages.findIndex((m) => m.id === message.id);
                    if (currentIndex === -1) {
                      console.error('Could not find the current message in the messages array.');
                      return;
                    }

                    // Находим предыдущее пользовательское сообщение
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

                    // Удаляем все сообщения после родительского
                    setMessages((prev) => prev.slice(0, parentMessageIndex + 1));

                    // Включаем режим генерации изображений
                    setImageGenerationMode(true);

                    // Добавляем сообщение пользователя для регенерации
                    const userMessage = messages[parentMessageIndex];
                    await append({
                      id: userMessage.id,
                      role: 'user',
                      content: userMessage.content,
                      createdAt: userMessage.createdAt,
                    });
                  }}
                />
              </div>
            );
          }

          // Обычный текстовый контент
          return (
            <div key={key} className="w-full px-2 sm:px-0">
              <div
                {...bind}
                className={cn(
                  'group relative rounded-lg border border-border/50 bg-card p-4 shadow-sm',
                  message.role === 'user' ? 'ml-auto max-w-[85%]' : 'mr-auto max-w-[85%]',
                  isPressed && 'scale-95 transition-transform duration-75',
                  isWelcome && 'border-primary/20 bg-primary/5'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2 overflow-hidden">
                    <SelectableText>
                      <MarkdownRenderer content={(part as any).text} />
                    </SelectableText>
                  </div>
                </div>

                {/* Показываем вложения если есть */}
                {attachments && attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-2 rounded border border-border/50 bg-muted/50 p-2"
                      >
                        {attachment.type.startsWith('image/') ? (
                          <div className="relative h-12 w-12 overflow-hidden rounded">
                            <Image
                              src={attachment.url}
                              alt={attachment.name}
                              fill
                              className="object-cover"
                              onClick={() => setLightbox({
                                url: attachment.url,
                                name: attachment.name,
                                type: attachment.type,
                                size: attachment.size
                              })}
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                            <span className="text-xs text-muted-foreground">
                              {attachment.ext?.toUpperCase() || 'FILE'}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.name}</p>
                          {attachment.size && (
                            <p className="text-xs text-muted-foreground">
                              {(attachment.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Показываем цитируемое сообщение если есть */}
                {(message as any).quotedMessage && (
                  <QuotedMessage
                    message={(message as any).quotedMessage}
                    onRemove={() => {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === message.id
                            ? { ...m, quotedMessage: undefined }
                            : m
                        )
                      );
                    }}
                  />
                )}

                {/* Контролы сообщения */}
                <MessageControls
                  message={message}
                  messages={messages}
                  threadId={threadId}
                  setMessages={setMessages}
                  reload={reload}
                  append={append}
                  stop={stop}
                  forceRegeneration={forceRegeneration}
                  isStreaming={isStreaming}
                  isWelcome={isWelcome}
                  canChat={canChat}
                  onEdit={() => setMode('edit')}
                  onShowMobileModal={() => setShowMobileModal(true)}
                />
              </div>
            </div>
          );
        }

        // Обработка других типов частей сообщения
        return null;
      })}
    </div>

    {/* Модальное окно для мобильных устройств */}
    {showMobileModal && (
      <MobileMessageModal
        message={message}
        messages={messages}
        threadId={threadId}
        setMessages={setMessages}
        reload={reload}
        append={append}
        stop={stop}
        forceRegeneration={forceRegeneration}
        isStreaming={isStreaming}
        isWelcome={isWelcome}
        canChat={canChat}
        onClose={() => setShowMobileModal(false)}
      />
    )}

    {/* Модальное окно для просмотра изображений */}
    {lightbox && (
      <ImageModal
        image={lightbox}
        onClose={() => setLightbox(null)}
      />
    )}

    {/* Редактор сообщения */}
    {mode === 'edit' && (
      <MessageEditor
        message={message}
        onSave={(content) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === message.id ? { ...m, content } : m
            )
          );
          setMode('view');
        }}
        onCancel={() => setMode('view')}
      />
    )}
    </>
  );
});

export default PureMessage;
