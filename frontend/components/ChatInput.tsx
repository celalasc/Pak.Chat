"use client";

import { ChevronDown, Check, ArrowUpIcon } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from '@/frontend/components/ui/textarea';
import ScrollToBottomButton from './ScrollToBottomButton';
import { cn } from '@/lib/utils';
import { Button } from '@/frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';
import useAutoResizeTextarea from '@/hooks/useAutoResizeTextArea';
import { UseChatHelpers, useCompletion } from '@ai-sdk/react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAPIKeyStore, APIKeys } from '@/frontend/stores/APIKeyStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import { AI_MODELS, AIModel, getModelConfig } from '@/lib/models';
import { UIMessage } from 'ai';
import AttachmentsBar from './AttachmentsBar';
import { useAttachmentsStore } from '../stores/AttachmentsStore';
import { v4 as uuidv4 } from 'uuid';
import { isConvexId } from '@/lib/ids';
import { StopIcon } from './ui/icons';
import { toast } from 'sonner';
import { useMessageSummary } from '../hooks/useMessageSummary';
import QuoteDisplay from './QuoteDisplay';
import { Input } from '@/frontend/components/ui/input';
import { useRouter } from 'next/navigation';

// Helper to convert File objects to Base64 data URLs
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

interface ChatInputProps {
  threadId: string;
  input: UseChatHelpers['input'];
  status: UseChatHelpers['status'];
  error: UseChatHelpers['error'];
  setInput: UseChatHelpers['setInput'];
  /** Reload chat with current messages without appending */
  reload: UseChatHelpers['reload'];
  setMessages: UseChatHelpers['setMessages'];
  stop: UseChatHelpers['stop'];
  messageCount: number;
  onThreadCreated?: (id: Id<'threads'>) => void;
}

interface StopButtonProps {
  stop: UseChatHelpers['stop'];
}

interface SendButtonProps {
  onSubmit: () => void;
  disabled: boolean;
}

const createUserMessage = (id: string, text: string, attachments?: any[]): UIMessage & { attachments?: any[] } => {
  return {
    id,
    parts: [{ type: 'text', text }],
    role: 'user',
    content: text,
    createdAt: new Date(),
    attachments,
  };
};

function PureChatInput({
  threadId,
  input,
  status,
  error,
  setInput,
  reload,
  setMessages,
  stop,
  messageCount,
  onThreadCreated,
}: ChatInputProps) {
  // Все хуки должны быть вызваны до любых условных возвратов
  const { hasRequiredKeys, keys, setKeys } = useAPIKeyStore();
  const canChat = hasRequiredKeys();
  const { currentQuote, clearQuote } = useQuoteStore();
  const [localKeys, setLocalKeys] = useState(keys);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 72,
    maxHeight: 200,
  });
  const createThread = useMutation(api.threads.create);
  const sendMessage = useMutation<typeof api.messages.send>(api.messages.send);
  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl);
  const saveAttachments = useMutation(api.attachments.save as any);
  const updateAttachmentMessageId = useMutation(api.attachments.updateMessageId);
  const { complete } = useMessageSummary();
  const { attachments, clear } = useAttachmentsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = useMemo(
    () => !input.trim() || status === 'streaming' || status === 'submitted' || isSubmitting,
    [input, status, isSubmitting]
  );
  
  // Синхронизируем localKeys с основным состоянием
  useEffect(() => {
    setLocalKeys(keys);
  }, [keys]);
  
  const saveKeys = useCallback(async () => {
    await setKeys(localKeys);
    toast.success('API keys saved');
  }, [setKeys, localKeys]);

  const handleSubmit = useCallback(async () => {
    if (isDisabled) return;
    setIsSubmitting(true);

    const currentInput = textareaRef.current?.value || input;
    let finalMessage = currentInput.trim();
    if (currentQuote) {
      finalMessage = `> ${currentQuote.text.replace(/\n/g, '\n> ')}\n\n${currentInput.trim()}`;
    }

    // Reset UI early
    setInput('');
    clearQuote();
    adjustHeight(true);

    try {
      // 1. Если это черновик, создаем тред заранее и сразу приводим тип
      const ensuredThreadId: Id<'threads'> = isConvexId(threadId)
        ? (threadId as Id<'threads'>)
        : await createThread({
            title: finalMessage.slice(0, 30) || 'New Chat',
          });

      // 2. Если тред новый, обновляем состояние без редиректа
      if (!isConvexId(threadId)) {
        onThreadCreated?.(ensuredThreadId);
        // Обновляем URL плавно без перезагрузки страницы (только на клиенте)
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', `/chat/${ensuredThreadId}`);
        }
      }

      // 3. Оптимистично добавляем сообщение в UI
      const attachmentsToUpload = [...attachments];
      const attachmentsForMessage = await Promise.all(
        attachmentsToUpload.map(async (att) => ({
          ...att,
          url: await fileToDataUrl(att.file),
        }))
      );
      const clientMsgId = uuidv4();
      const userMessage = createUserMessage(
        clientMsgId,
        finalMessage,
        attachmentsForMessage,
      );
      setMessages((prev) => [...prev, userMessage]);
      clear();

      // 4. Сохраняем сообщение в БД
      let savedAttachments: any[] = [];
      if (attachmentsToUpload.length > 0) {
        try {
          const uploadedFiles = await Promise.all(
            attachmentsToUpload.map(async (attachment) => {
              const uploadUrl = await generateUploadUrl();
              const result = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': attachment.file.type },
                body: attachment.file,
              });
              if (!result.ok) throw new Error(`Failed to upload ${attachment.name}`);
              const { storageId } = await result.json();
              return {
                storageId,
                name: attachment.name,
                type: attachment.type,
                messageId: clientMsgId,
              };
            })
          );
          savedAttachments = await saveAttachments({
            threadId: ensuredThreadId,
            attachments: uploadedFiles,
          });
        } catch (err) {
          toast.error('Failed to upload attachments');
          console.error(err);
        }
      }

      const dbMsgId = await sendMessage({
        threadId: ensuredThreadId,
        content: finalMessage,
        role: 'user',
      });

      if (savedAttachments.length > 0) {
        await updateAttachmentMessageId({
          attachmentIds: savedAttachments.map((a) => a.id),
          messageId: dbMsgId,
        });
      }

      // 5. Обновляем UI с реальным ID
      setMessages((prev) => prev.map((m) => (m.id === clientMsgId ? { ...m, id: dbMsgId } : m)));

      // 6. Генерация заголовка только для новых тредов
      // if (!isConvexId(threadId)) {
      //   complete(finalMessage, {
      //     body: { threadId: ensuredThreadId, messageId: dbMsgId, isTitle: true },
      //   });
      // }

    } catch (error) {
      toast.error('Failed to send message.');
      setInput(currentInput);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isDisabled,
    input,
    threadId,
    attachments,
    currentQuote,
    setInput,
    clearQuote,
    adjustHeight,
    clear,
    createThread,
    sendMessage,
    generateUploadUrl,
    saveAttachments,
    updateAttachmentMessageId,
    setMessages,
    complete,
    router,
    onThreadCreated,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      adjustHeight();
    },
    [setInput, adjustHeight]
  );

  const handleFocus = useCallback(() => {
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300);
    }
  }, []);

  // Если есть ошибка и нельзя отправлять сообщения, показываем форму для ввода API ключей
  if (error && !canChat) {
    return (
      <div className="w-full flex justify-center pb-safe mobile-keyboard-fix">
        <div className={cn('backdrop-blur-md bg-secondary p-4 pb-2 border-t border-border/50 max-w-3xl w-full', messageCount === 0 ? 'rounded-[20px]' : 'rounded-t-[20px]')}>
          <div className="space-y-2">
            {(['google','openrouter','openai'] as const).map(provider => (
              <Input key={provider}
                value={localKeys[provider]||''}
                onChange={e => setLocalKeys((prev: APIKeys) => ({ ...prev, [provider]: e.target.value }))}
                placeholder={`${provider.charAt(0).toUpperCase()+provider.slice(1)} API Key`} />
            ))}
          </div>
          <Button className="mt-2 w-full" onClick={saveKeys}>Save API Keys</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full flex justify-center pb-safe mobile-keyboard-fix">
        <div ref={containerRef} className={cn('backdrop-blur-md bg-secondary p-2 pb-0 border-t border-border/50 max-w-3xl w-full', messageCount === 0 ? 'rounded-[20px]' : 'rounded-t-[20px]')}>
          {/* Scroll to bottom button */}
          {messageCount > 0 && (
            <div className="absolute right-4 -top-12 z-50">
              <ScrollToBottomButton />
            </div>
          )}
          <div className="relative">
            {/* Provider links when no API keys */}
            {!canChat && messageCount > 1 && (
              <div className="flex flex-wrap justify-around gap-4 px-4 py-2 bg-secondary">
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                  Create Google API Key
                </a>
                <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                  Create OpenRouter API Key
                </a>
                <a href="https://platform.openai.com/settings/organization/api-keys" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                  Create OpenAI API Key
                </a>
              </div>
            )}

            <div className="flex flex-col">
              {/* Attachments at the top */}
              {attachments.length > 0 && (
                <div className="bg-secondary px-4 pt-3">
                  <AttachmentsBar mode="full" />
                </div>
              )}
              
              {/* Quote display */}
              {currentQuote && (
                <div className="bg-secondary px-4 pt-3">
                  <QuoteDisplay quote={currentQuote} onRemove={clearQuote} />
                </div>
              )}
              
              {/* Text input */}
              <div className="bg-secondary overflow-y-auto max-h-[300px]">
                <Textarea
                  id="chat-input"
                  value={input}
                  placeholder={!canChat ? "Enter API key to enable chat" : "What can I do for you?"}
                  className={cn(
                    'w-full px-4 py-3 border-none shadow-none dark:bg-transparent',
                    'placeholder:text-muted-foreground resize-none',
                    'focus-visible:ring-0 focus-visible:ring-offset-0',
                    'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30',
                    'scrollbar-thumb-rounded-full',
                    'min-h-[72px]'
                  )}
                  ref={textareaRef}
                  onKeyDown={handleKeyDown}
                  onChange={handleInputChange}
                  onFocus={handleFocus}
                  aria-label="Chat message input"
                  aria-describedby="chat-input-description"
                  disabled={!canChat}
                />
                <span id="chat-input-description" className="sr-only">
                  {canChat ? 'Press Enter to send, Shift+Enter for new line' : 'Enter API key to enable chat'}
                </span>
              </div>
            </div>
            
            {/* Bottom controls */}
            <div className="h-14 flex items-center px-2">
              <div className="flex items-center justify-between w-full gap-2 overflow-x-auto">
                {/* Add file button only when no attachments */}
                {attachments.length === 0 && (
                  <div className="flex items-center">
                    <AttachmentsBar mode="compact" />
                  </div>
                )}
                
                <div className="flex items-center gap-2 ml-auto">
                  <ChatModelDropdown />

                  {status === 'submitted' || status === 'streaming' ? (
                    <StopButton stop={stop} />
                  ) : (
                    <SendButton onSubmit={handleSubmit} disabled={isDisabled || !canChat} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const ChatInput = memo(PureChatInput, (prevProps, nextProps) => {
  return (
    prevProps.input === nextProps.input &&
    prevProps.status === nextProps.status &&
    prevProps.messageCount === nextProps.messageCount
  );
});

const PureChatModelDropdown = () => {
  const { getKey } = useAPIKeyStore();
  const { selectedModel, setModel } = useModelStore();

  const isModelEnabled = useCallback(
    (model: AIModel) => {
      const modelConfig = getModelConfig(model);
      const apiKey = getKey(modelConfig.provider);
      return !!apiKey;
    },
    [getKey]
  );

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-1 h-8 pl-2 pr-2 text-xs rounded-md text-foreground hover:bg-primary/10 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500"
            aria-label={`Selected model: ${selectedModel}`}
          >
            <div className="flex items-center gap-1">
              {selectedModel}
              <ChevronDown className="w-3 h-3 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className={cn('min-w-[10rem]', 'border-border', 'bg-popover')}
        >
          {AI_MODELS.map((model) => {
            const isEnabled = isModelEnabled(model);
            return (
              <DropdownMenuItem
                key={model}
                onSelect={() => isEnabled && setModel(model)}
                disabled={!isEnabled}
                className={cn(
                  'flex items-center justify-between gap-2',
                  'cursor-pointer'
                )}
              >
                <span>{model}</span>
                {selectedModel === model && (
                  <Check
                    className="w-4 h-4 text-blue-500"
                    aria-label="Selected"
                  />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const ChatModelDropdown = memo(PureChatModelDropdown);

const PureStopButton = ({ stop }: StopButtonProps) => {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={stop}
      aria-label="Stop generating response"
      className="rounded-full"
    >
      <StopIcon size={20} />
    </Button>
  );
};

const StopButton = memo(PureStopButton);

const PureSendButton = ({ onSubmit, disabled }: SendButtonProps) => {
  return (
    <Button
      onClick={onSubmit}
      variant="default"
      size="icon"
      disabled={disabled}
      aria-label="Send message"
      className="rounded-full"
    >
      <ArrowUpIcon size={18} />
    </Button>
  );
};

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  return prevProps.disabled === nextProps.disabled;
});

// Обёртка для решения проблемы с Rules of Hooks
function ChatInputWrapper(props: ChatInputProps) {
  const { keysLoading } = useAPIKeyStore();
  if (keysLoading) {
    // Показать скелетон, чтобы сохранить высоту и не дёргать разметку
    const ChatInputSkeleton = require('./ChatInputSkeleton').default;
    return <ChatInputSkeleton />;
  }
  return <ChatInput {...props} />;
}

export default ChatInputWrapper;
