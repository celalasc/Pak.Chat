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
import { useParams } from 'react-router';
import { useNavigate } from 'react-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import { AI_MODELS, AIModel, getModelConfig } from '@/lib/models';
import { UIMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { isConvexId } from '@/lib/ids';
import { StopIcon } from './ui/icons';
import { toast } from 'sonner';
import { useMessageSummary } from '../hooks/useMessageSummary';
import QuoteDisplay from './QuoteDisplay';
import { Input } from '@/frontend/components/ui/input';

interface ChatInputProps {
  threadId: string;
  input: UseChatHelpers['input'];
  status: UseChatHelpers['status'];
  error: UseChatHelpers['error'];
  setInput: UseChatHelpers['setInput'];
  append: UseChatHelpers['append'];
  stop: UseChatHelpers['stop'];
  messageCount: number;
}

interface StopButtonProps {
  stop: UseChatHelpers['stop'];
}

interface SendButtonProps {
  onSubmit: () => void;
  disabled: boolean;
}

const createUserMessage = (id: string, text: string): UIMessage => ({
  id,
  parts: [{ type: 'text', text }],
  role: 'user',
  content: text,
  createdAt: new Date(),
});

function PureChatInput({
  threadId,
  input,
  status,
  error,
  setInput,
  append,
  stop,
  messageCount,
}: ChatInputProps) {
  // Все хуки должны быть вызваны до любых условных возвратов
  const { hasRequiredKeys, keys, setKeys, keysLoading } = useAPIKeyStore();
  if (keysLoading) return null; // hide input until keys are loaded
  const canChat = hasRequiredKeys();
  const { currentQuote, clearQuote } = useQuoteStore();
  const [localKeys, setLocalKeys] = useState(keys);
  const containerRef = useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 72,
    maxHeight: 200,
  });
  const navigate = useNavigate();
  const { id } = useParams();
  const createThread = useMutation(api.threads.create);
  const sendMessage = useMutation(api.messages.send);
  const { complete } = useMessageSummary();

  const isDisabled = useMemo(
    () => !input.trim() || status === 'streaming' || status === 'submitted',
    [input, status]
  );
  
  // Синхронизируем localKeys с основным состоянием
  useEffect(() => {
    setLocalKeys(keys);
  }, [keys]);
  
  const saveKeys = async () => { 
    await setKeys(localKeys); 
    toast.success('API keys saved'); 
  };

  const handleSubmit = useCallback(async () => {
    if (!canChat) {
      return;
    }
    if (!input.trim() || status === 'streaming' || status === 'submitted') return;

    const currentInput = textareaRef.current?.value || input;

    const messageId = uuidv4();

    // Формируем финальный текст сообщения с цитатой
    let finalMessage = currentInput.trim();
    if (currentQuote) {
      finalMessage = `> ${currentQuote.text.replace(/\n/g, '\n> ')}\n\n${currentInput.trim()}`;
    }

    let currentThreadId: Id<'threads'>;
    const valid = isConvexId(id);
    if (!id || !valid) {
      const newThreadId = await createThread({ title: 'New Chat' });
      navigate(`/chat/${newThreadId}`);
      currentThreadId = newThreadId;
      complete(finalMessage, {
        body: { threadId: newThreadId, messageId, isTitle: true },
      });
    } else {
      currentThreadId = id as Id<'threads'>;
      complete(finalMessage, { body: { messageId, threadId: currentThreadId } });
    }

    const userMessage = createUserMessage(messageId, finalMessage);

    append(userMessage);
    setInput('');
    clearQuote(); // Очищаем цитату после отправки
    adjustHeight(true);

    await sendMessage({
      threadId: currentThreadId as Id<'threads'>,
      content: finalMessage,
      role: 'user',
    });
  }, [
    canChat,
    input,
    status,
    setInput,
    adjustHeight,
    append,
    id,
    textareaRef,
    threadId,
    complete,
    currentQuote,
    clearQuote,
    createThread,
    sendMessage,
    navigate,
    isConvexId,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustHeight();
  };

  // Если есть ошибка и нельзя отправлять сообщения, показываем форму для ввода API ключей
  if (error && !canChat) {
    return (
      <div className={`fixed w-full max-w-3xl bottom-0 ${messageCount === 0 ? 'md:bottom-auto md:top-1/2 md:transform md:-translate-y-1/2' : ''}`}>
        <div className={cn('bg-secondary p-4 pb-2 w-full', messageCount === 0 ? 'rounded-[20px]' : 'rounded-t-[20px]')}>
          <div className="space-y-2">
            {(['google','openrouter','openai'] as const).map(provider => (
              <Input key={provider}
                value={localKeys[provider]||''}
                onChange={e => setLocalKeys(prev => ({ ...prev, [provider]: e.target.value }))}
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
      <div className={`fixed w-full max-w-3xl ${messageCount === 0 ? 'md:bottom-auto md:top-1/2 md:transform md:-translate-y-1/2' : 'bottom-0 pb-safe'}`}>
        <div ref={containerRef} className={cn('relative bg-secondary p-2 pb-0 w-full', messageCount === 0 ? 'rounded-[20px]' : 'rounded-t-[20px]')}>
          {/* Scroll to bottom button */}
          <div className="absolute right-4 -top-12 z-50">
            <ScrollToBottomButton />
          </div>
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
              {currentQuote && (
                <div className="bg-secondary px-4 pt-3">
                  <QuoteDisplay quote={currentQuote} onRemove={clearQuote} />
                </div>
              )}
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
                  onFocus={() => {
                    // На мобильных устройствах прокручиваем к полю ввода при фокусе
                    if (window.innerWidth <= 768) {
                      setTimeout(() => {
                        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 300);
                    }
                  }}
                  aria-label="Chat message input"
                  aria-describedby="chat-input-description"
                  disabled={!canChat}
                />
                <span id="chat-input-description" className="sr-only">
                  {canChat ? 'Press Enter to send, Shift+Enter for new line' : 'Enter API key to enable chat'}
                </span>
              </div>
            </div>
            <div className="h-14 flex items-center px-2">
              <div className="flex items-center justify-between w-full">
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

export default ChatInput;
