'use client';

import { ChevronDown, Check, ArrowUpIcon } from 'lucide-react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
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
import { UseChatHelpers } from '@ai-sdk/react';
import { useParams, useNavigate } from 'react-router';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import styles from '@/frontend/styles/chat.module.css';
import { createMessage, createThread } from '@/frontend/dexie/queries';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import { AI_MODELS, AIModel, getModelConfig } from '@/lib/models';
import { UIMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { StopIcon } from './ui/icons';
import { toast } from 'sonner';
import { useMessageSummary } from '../hooks/useMessageSummary';
import QuoteDisplay from './QuoteDisplay';
import { Input } from '@/frontend/components/ui/input';

/* -------------------------------------------------------------------------------- */
/*  Константы                                                                       */
/* -------------------------------------------------------------------------------- */

export const CHAT_INPUT_HEIGHT = 72; // px – используется и в Messages для отступа

/* -------------------------------------------------------------------------------- */
/*  Типы                                                                            */
/* -------------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------------- */
/*  Вспомогательные функции                                                         */
/* -------------------------------------------------------------------------------- */

const createUserMessage = (id: string, text: string): UIMessage => ({
  id,
  parts: [{ type: 'text', text }],
  role: 'user',
  content: text,
  createdAt: new Date(),
});

/* -------------------------------------------------------------------------------- */
/*  Основной компонент                                                              */
/* -------------------------------------------------------------------------------- */

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
  /* ----------------------- глобальные сто́ры ----------------------------------- */

  const canChat = useAPIKeyStore((state) => state.hasRequiredKeys());
  const keys = useAPIKeyStore((s) => s.keys);
  const setKeys = useAPIKeyStore((s) => s.setKeys);

  const { currentQuote, clearQuote } = useQuoteStore();
  const { complete } = useMessageSummary();

  /* ----------------------- локальное состояние ---------------------------------- */

  const [localKeys, setLocalKeys] = useState(keys);
  const [keyboardFix, setKeyboardFix] = useState(false); // iOS-клавиатура

  /* ----------------------- навигация / роутинг ---------------------------------- */

  const navigate = useNavigate();
  const { id } = useParams();

  /* ----------------------- хуки / рефы ----------------------------------------- */

  const { isMobile } = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: CHAT_INPUT_HEIGHT,
    maxHeight: 200,
  });

  /* ----------------------- мемо / вычисления ----------------------------------- */

  const isDisabled = useMemo(
    () => !input.trim() || status === 'streaming' || status === 'submitted',
    [input, status]
  );

  /* ----------------------- handlers -------------------------------------------- */

  const saveKeys = () => {
    setKeys(localKeys);
    toast.success('API keys saved');
  };

  const handleSubmit = useCallback(async () => {
    if (!canChat) return;
    if (!input.trim() || status === 'streaming' || status === 'submitted') return;

    const currentInput = textareaRef.current?.value ?? input;
    const messageId = uuidv4();

    /* Формируем текст с учётом цитаты */
    let finalMessage = currentInput.trim();
    if (currentQuote) {
      finalMessage = `> ${currentQuote.text.replace(/\n/g, '\n> ')}\n\n${finalMessage}`;
    }

    /* Новый тред? */
    if (!id) {
      navigate(`/chat/${threadId}`);
      await createThread(threadId);
      complete(finalMessage, { body: { threadId, messageId, isTitle: true } });
    } else {
      complete(finalMessage, { body: { messageId, threadId } });
    }

    /* Пишем в IndexedDB и в память UI */
    const userMessage = createUserMessage(messageId, finalMessage);
    await createMessage(threadId, userMessage);
    append(userMessage);

    /* Сбросы */
    setInput('');
    clearQuote();
    adjustHeight(true);
  }, [
    canChat,
    input,
    status,
    textareaRef,
    currentQuote,
    id,
    threadId,
    navigate,
    complete,
    setInput,
    clearQuote,
    append,
    adjustHeight,
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

  /* -------------------------------------------------------------------------------- */
  /*  UI: при отсутствии ключей показываем форму, иначе обычный инпут                 */
  /* -------------------------------------------------------------------------------- */

  if (error) {
    return (
      <div
        className={cn(
          'fixed bottom-0 w-full',
          styles.desktopInput,
          'max-w-3xl',
          messageCount === 0 &&
            'md:bottom-auto md:top-1/2 md:transform md:-translate-y-1/2'
        )}
        style={{ height: CHAT_INPUT_HEIGHT }}
      >
        <div
          className={cn(
            'bg-secondary p-4 pb-2 w-full',
            messageCount === 0 ? 'rounded-[20px]' : 'rounded-t-[20px]'
          )}
        >
          <div className="space-y-2">
            {(['google', 'openrouter', 'openai'] as const).map((provider) => (
              <Input
                key={provider}
                value={localKeys[provider] || ''}
                onChange={(e) =>
                  setLocalKeys((prev) => ({ ...prev, [provider]: e.target.value }))
                }
                placeholder={`${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key`}
              />
            ))}
          </div>
          <Button className="mt-2 w-full" onClick={saveKeys}>
            Save API Keys
          </Button>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------------- */
  /*  Рендер основного поля ввода                                                     */
  /* -------------------------------------------------------------------------------- */

  const wrapperClass = cn(
    isMobile ? 'fixed bottom-0 pb-safe w-full' : 'sticky bottom-0 pb-safe',
    !isMobile && styles.desktopInput,
    keyboardFix && 'mobile-keyboard-fix',
    messageCount === 0 &&
      'md:bottom-auto md:top-1/2 md:transform md:-translate-y-1/2'
  );

  return (
    <div
      ref={containerRef}
      className={wrapperClass}
      style={isMobile ? { height: CHAT_INPUT_HEIGHT } : undefined}
    >
      <div
        className={cn(
          'relative bg-secondary p-2 pb-0 w-full',
          messageCount === 0 ? 'rounded-[20px]' : 'rounded-t-[20px]'
        )}
      >
        {/* Кнопка «вниз» */}
        <div className="absolute right-4 -top-12 z-50">
          <ScrollToBottomButton />
        </div>

        <div className="relative">
          {/* Ссылки на создание ключей */}
          {!canChat && messageCount > 1 && (
            <div className="flex flex-wrap justify-around gap-4 px-4 py-2 bg-secondary">
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                Create Google API Key
              </a>
              <a
                href="https://openrouter.ai/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                Create OpenRouter API Key
              </a>
              <a
                href="https://platform.openai.com/settings/organization/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
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
                placeholder={
                  !canChat ? 'Enter API key to enable chat' : 'What can I do for you?'
                }
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
                  /* фиксим iOS «jump» */
                  if (window.innerWidth <= 768) {
                    setKeyboardFix(true);
                    textareaRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
                  }
                }}
                onBlur={() => setKeyboardFix(false)}
                aria-label="Chat message input"
                aria-describedby="chat-input-description"
                disabled={!canChat}
              />
              <span id="chat-input-description" className="sr-only">
                {canChat
                  ? 'Press Enter to send, Shift+Enter for new line'
                  : 'Enter API key to enable chat'}
              </span>
            </div>
          </div>

          {/* Нижняя панель с выбором модели и кнопкой отправки */}
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
  );
}

/* -------------------------------------------------------------------------------- */
/*  memo-обёртки                                                                    */
/* -------------------------------------------------------------------------------- */

const ChatInput = memo(PureChatInput, (prev, next) => {
  return (
    prev.input === next.input &&
    prev.status === next.status &&
    prev.messageCount === next.messageCount
  );
});

/* ---- Dropdown модели ---- */

const PureChatModelDropdown = () => {
  const getKey = useAPIKeyStore((state) => state.getKey);
  const keys = useAPIKeyStore((state) => state.keys);
  const { selectedModel, setModel } = useModelStore();

  const isModelEnabled = useCallback(
    (model: AIModel) => {
      const cfg = getModelConfig(model);
      return !!getKey(cfg.provider);
    },
    [getKey, keys]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-1 h-8 pl-2 pr-2 text-xs rounded-md text-foreground hover:bg-primary/10 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500"
        >
          <span className="flex items-center gap-1">
            {selectedModel}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className={cn('min-w-[10rem]', 'border-border', 'bg-popover')}>
        {AI_MODELS.map((model) => {
          const enabled = isModelEnabled(model);
          return (
            <DropdownMenuItem
              key={model}
              onSelect={() => enabled && setModel(model)}
              disabled={!enabled}
              className="flex items-center justify-between gap-2 cursor-pointer"
            >
              <span>{model}</span>
              {selectedModel === model && <Check className="w-4 h-4 text-blue-500" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ChatModelDropdown = memo(PureChatModelDropdown);

/* ---- Stop / Send ---- */

const PureStopButton = ({ stop }: StopButtonProps) => (
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

const StopButton = memo(PureStopButton);

const PureSendButton = ({ onSubmit, disabled }: SendButtonProps) => (
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

const SendButton = memo(PureSendButton, (prev, next) => prev.disabled === next.disabled);

export default ChatInput;
