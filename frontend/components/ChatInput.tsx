"use client";

import { ChevronDown, Check, ArrowUpIcon, Star, ChevronUp, ChevronLeft } from 'lucide-react';
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
import { useRecentFilesIntegration } from './RecentFilesDropdown';

// Helper to convert File objects to Base64 data URLs
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Helper to get image dimensions
const getImageDimensions = (file: File): Promise<{ width: number; height: number } | null> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(null);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    
    img.src = url;
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

interface ChatModelDropdownProps {
  messageCount?: number;
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

  // Интеграция с недавними файлами
  useRecentFilesIntegration();

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
              
              // Получаем размеры изображения если это изображение
              const dimensions = await getImageDimensions(attachment.file);
              
              return {
                storageId,
                name: attachment.name,
                type: attachment.type,
                messageId: clientMsgId,
                width: dimensions?.width,
                height: dimensions?.height,
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

      // 6. Генерация заголовка в фоне для нового чата
      if (!isConvexId(threadId)) {
        complete(finalMessage, {
          body: { threadId: ensuredThreadId, messageId: dbMsgId, isTitle: true },
        });
      }

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
          <div className="relative rounded-[16px] overflow-hidden">
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
                {/* Left side: Add file button and model selection */}
                <div className="flex items-center gap-2">
                  <AttachmentsBar mode="compact" messageCount={messageCount} />
                  <ChatModelDropdown messageCount={messageCount} />
                </div>
                
                {/* Right side: Send/Stop button */}
                <div className="flex items-center gap-2">
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

const PureChatModelDropdown = ({ messageCount = 0 }: ChatModelDropdownProps) => {
  const { getKey } = useAPIKeyStore();
  const { selectedModel, setModel, favoriteModels, toggleFavorite, isFavorite } = useModelStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Функция для получения иконки разработчика
  const getProviderIcon = useCallback((model: AIModel) => {
    const config = getModelConfig(model);
    switch (config.company) {
      case 'OpenAI':
        return (
          <svg className="h-3 w-3 text-foreground" fill="currentColor" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"></path>
          </svg>
        );
      case 'Google':
        return (
          <svg className="h-3 w-3 text-foreground" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
            <path d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z"/>
          </svg>
        );
      case 'DeepSeek':
        return (
          <svg className="h-3 w-3 text-foreground" fill="currentColor" fillRule="evenodd" height="1em" style={{flex:'none',lineHeight:1}} viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.036 2c-3.853-.035-7 3-7.036 6.781-.035 3.782 3.055 6.872 6.908 6.907h2.42v-2.566h-2.292c-2.407.028-4.38-1.866-4.408-4.23-.029-2.362 1.901-4.298 4.308-4.326h.1c2.407 0 4.358 1.915 4.365 4.278v6.305c0 2.342-1.944 4.25-4.323 4.279a4.375 4.375 0 01-3.033-1.252l-1.851 1.818A7 7 0 0012.029 22h.092c3.803-.056 6.858-3.083 6.879-6.816v-6.5C18.907 4.963 15.817 2 12.036 2z"></path>
          </svg>
        );
      default:
        return null;
    }
  }, []);

  const isModelEnabled = useCallback(
    (model: AIModel) => {
      const modelConfig = getModelConfig(model);
      const apiKey = getKey(modelConfig.provider);
      return !!apiKey;
    },
    [getKey]
  );

  // Получаем включенные модели
  const enabledFavorites = useMemo(() => 
    favoriteModels.filter(isModelEnabled), 
    [favoriteModels, isModelEnabled]
  );

  const enabledOthers = useMemo(() => 
    AI_MODELS.filter(model => !favoriteModels.includes(model) && isModelEnabled(model)),
    [favoriteModels, isModelEnabled]
  );

  const handleModelSelect = useCallback((model: AIModel) => {
    if (isModelEnabled(model)) {
      setModel(model);
      setIsOpen(false);
      setIsExpanded(false);
    }
  }, [isModelEnabled, setModel]);

  const handleToggleFavorite = useCallback((model: AIModel, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(model);
  }, [toggleFavorite]);

  const handleShowAll = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleBackToFavorites = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setIsExpanded(false);
        }
      }}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-1 h-8 pl-3 pr-2 text-xs rounded-lg text-foreground hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500 transition-colors"
            aria-label={`Selected model: ${selectedModel}`}
          >
            <div className="flex items-center gap-1">
              {selectedModel}
              <ChevronDown className="w-3 h-3 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className={cn(
            !isExpanded ? 'w-64' : 'w-80',
            'border border-border/50 bg-popover/95 backdrop-blur-sm shadow-xl rounded-xl overflow-hidden'
          )}
          align="center"
          side="top"
          sideOffset={12}
          avoidCollisions={true}
          style={{
            maxHeight: '70vh',
            minHeight: 'auto'
          }}
        >
          <div className="overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30 scrollbar-thumb-rounded-full">
            {!isExpanded ? (
              // Компактный вид - только избранные
              <div className="p-3">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground/80 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <Star className="w-3 h-3" />
                  Favorites
                </div>
                
                {enabledFavorites.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No favorite models
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    {enabledFavorites.map((model) => (
                      <div
                        key={model}
                        onClick={() => handleModelSelect(model)}
                        className={cn(
                          'relative flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer group hover:scale-[1.02]',
                          selectedModel === model 
                            ? 'border-primary bg-primary/10 shadow-md' 
                            : 'border-border/60 hover:border-primary/40 hover:bg-accent hover:shadow-md'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {getProviderIcon(model)}
                          <div className="text-sm font-medium">{model}</div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {selectedModel === model && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Кнопка Show all */}
                <div className="flex justify-start">
                  <button
                    onClick={handleShowAll}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg hover:scale-105"
                  >
                    Show all
                    <ChevronUp className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              // Расширенный вид - все модели
              <div className="p-3">
                {/* Избранные модели */}
                {enabledFavorites.length > 0 && (
                  <div className="mb-6">
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground/80 mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Star className="w-3 h-3" />
                      Favorites
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {enabledFavorites.map((model) => (
                        <div
                          key={model}
                          onClick={() => handleModelSelect(model)}
                          className={cn(
                            'relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer group h-20 hover:scale-[1.05] hover:shadow-lg',
                            selectedModel === model 
                              ? 'border-primary bg-primary/10 shadow-md' 
                              : 'border-border/60 hover:border-primary/40 hover:bg-accent'
                          )}
                        >
                          {/* Иконка разработчика */}
                          <div className="mb-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            {getProviderIcon(model)}
                          </div>
                          
                          <div className="text-xs font-medium text-center leading-tight">
                            {model}
                          </div>
                          
                          {/* Звездочка при наведении */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-0.5 right-0.5 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleToggleFavorite(model, e)}
                          >
                            <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                          </Button>
                          
                          {/* Галочка для выбранной модели */}
                          {selectedModel === model && (
                            <div className="absolute top-0.5 left-0.5">
                              <Check className="w-3 h-3 text-primary" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Остальные модели */}
                {enabledOthers.length > 0 && (
                  <div className="mb-4">
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground/80 mb-3 uppercase tracking-wide">
                      Others
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {enabledOthers.map((model) => (
                        <div
                          key={model}
                          onClick={() => handleModelSelect(model)}
                          className={cn(
                            'relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer group h-20 hover:scale-[1.05] hover:shadow-lg',
                            selectedModel === model 
                              ? 'border-primary bg-primary/10 shadow-md' 
                              : 'border-border/60 hover:border-primary/40 hover:bg-accent'
                          )}
                        >
                          {/* Иконка разработчика */}
                          <div className="mb-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            {getProviderIcon(model)}
                          </div>
                          
                          <div className="text-xs font-medium text-center leading-tight">
                            {model}
                          </div>
                          
                          {/* Звездочка при наведении */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-0.5 right-0.5 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleToggleFavorite(model, e)}
                          >
                            <Star className="w-2.5 h-2.5 text-muted-foreground hover:text-yellow-500" />
                          </Button>
                          
                          {/* Галочка для выбранной модели */}
                          {selectedModel === model && (
                            <div className="absolute top-0.5 left-0.5">
                              <Check className="w-3 h-3 text-primary" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Кнопка назад */}
                <div className="flex justify-start">
                  <button
                    onClick={handleBackToFavorites}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg hover:scale-105"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    Back to Favorites
                  </button>
                </div>
              </div>
            )}
          </div>
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

