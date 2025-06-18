import { memo, useState, useEffect, useMemo } from 'react';
import MarkdownRenderer from '@/frontend/components/MemoizedMarkdown';
import { cn } from '@/lib/utils';
import { UIMessage } from 'ai';
import MessageControls from './MessageControls';
import { UseChatHelpers } from '@ai-sdk/react';
import dynamic from 'next/dynamic';
const MessageEditor = dynamic(() => import('./MessageEditor'), { ssr: false, loading: () => null });
import ErrorBoundary from './ErrorBoundary';
import MessageReasoning from './MessageReasoning';
import SelectableText from './SelectableText';
import QuotedMessage from './QuotedMessage';
import ImageModal from './ImageModal';
import { Input } from '@/frontend/components/ui/input';
import { Button } from '@/frontend/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAPIKeyStore, type APIKeys } from '@/frontend/stores/APIKeyStore';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { SearchIcon } from 'lucide-react';

function PureMessage({
  threadId,
  message,
  setMessages,
  messages,
  reload,
  append,
  isStreaming,
  stop,
}: {
  threadId: string;
  message: UIMessage;
  setMessages: UseChatHelpers['setMessages'];
  messages: UIMessage[];
  reload: UseChatHelpers['reload'];
  append: UseChatHelpers['append'];
  isStreaming: boolean;
  stop: UseChatHelpers['stop'];
}) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [mobileControlsVisible, setMobileControlsVisible] = useState(false);
  const isWelcome = message.id === 'welcome';
  const attachments = (message as any).attachments as { id: string; url: string; name: string; type: string; ext?: string; size?: number }[] | undefined;
  

  const [lightbox, setLightbox] = useState<{
    url: string;
    name: string;
    type: string;
    size?: number;
  } | null>(null);
  const { keys, setKeys } = useAPIKeyStore();
  const [localKeys, setLocalKeys] = useState<APIKeys>(keys);
  const { isMobile } = useIsMobile();
  
  useEffect(() => { setLocalKeys(keys); }, [keys]);
  
  const saveKeys = () => { setKeys(localKeys); toast.success('API keys saved'); };
  const router = useRouter();
  const { hasRequiredKeys } = useAPIKeyStore();
  const canChat = hasRequiredKeys();

  const handleNewChat = () => {
    router.push(`/chat`);
  };

  const handleMobileMessageClick = () => {
    if (isMobile && !isWelcome) {
      setMobileControlsVisible(!mobileControlsVisible);
    }
  };

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

  return (
    <>
    <div
      id={`message-${message.id}`}
      role="article"
      data-role={message.role}
      className={cn(
        'flex flex-col',
        message.role === 'user' ? 'items-end' : 'items-start'
      )}
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
          if (isWelcome && message.role === 'assistant') {
            return (
              <div key={key} className="w-full px-2 sm:px-0 space-y-4">
                <h3 className="text-base font-semibold">Welcome to Pak.Chat</h3>
                <SelectableText messageId={message.id} disabled>
                  <MarkdownRenderer content={part.text} streaming={isStreaming} />
                </SelectableText>
                <div className="space-y-6 mt-4">
                  {(['google','openrouter','openai'] as const).map(provider => (
                    <div key={provider} className="flex flex-col gap-2">
                      <Label htmlFor={provider} className="flex gap-1 text-sm">
                        <span>{provider.charAt(0).toUpperCase()+provider.slice(1)} API Key</span>
                        {provider === 'google' && <span className="text-muted-foreground">(Required)</span>}
                      </Label>
                      <Input id={provider}
                        placeholder={provider === 'google' ? 'AIza...' : provider === 'openrouter' ? 'sk-or-...' : 'sk-...'}
                        value={localKeys[provider]||''}
                        onChange={e =>
                            setLocalKeys((prev: APIKeys) => ({
                              ...prev,
                              [provider]: e.target.value,
                            }))
                        }
                      />
                      <a href={provider === 'google' ? 'https://aistudio.google.com/apikey' : provider === 'openrouter' ? 'https://openrouter.ai/settings/keys' : 'https://platform.openai.com/settings/organization/api-keys'}
                         target="_blank" rel="noopener noreferrer"
                         className="text-xs text-blue-500 hover:underline inline w-fit">
                        Create {provider.charAt(0).toUpperCase()+provider.slice(1)} API Key
                      </a>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="bg-gray-50 text-gray-600 dark:bg-secondary dark:text-secondary-foreground" onClick={saveKeys}>
                    Save
                  </Button>
                  {canChat && (
                    <Button size="sm" variant="outline" onClick={handleNewChat}>
                      New Chat
                    </Button>
                  )}
                </div>
              </div>
            );
          }
          return message.role === 'user' ? (
            <div
              key={key}
              className={cn(
                'relative group px-4 py-3 rounded-xl bg-secondary border border-secondary-foreground/2 max-w-[90%] sm:max-w-[80%] mx-2 sm:mx-0',
                isMobile && 'cursor-pointer'
              )}
              onClick={handleMobileMessageClick}
            >
              {attachments && attachments.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {attachments.map((a, index) =>
                    a.type.startsWith('image') ? (
                      <img
                        key={`${a.id}-${index}`}
                        src={a.url}
                        className="h-32 w-32 rounded cursor-pointer hover:scale-105 transition object-cover"
                        onClick={() => setLightbox({
                          url: a.url,
                          name: a.name,
                          type: a.type,
                          size: a.size,
                        })}
                        alt={a.name}
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <a
                        key={`${a.id}-${index}`}
                        href={a.url}
                        target="_blank"
                        className="h-10 w-28 bg-muted rounded flex flex-col items-center justify-center text-[10px] px-1 hover:bg-accent"
                      >
                        <span className="line-clamp-1">{a.name}</span>
                        <span className="text-muted-foreground">{a.ext}</span>
                      </a>
                    )
                  )}
                </div>
              )}

              {mode === 'edit' && (
                <ErrorBoundary>
                  <MessageEditor
                    threadId={threadId}
                    message={message}
                    content={part.text}
                    setMessages={setMessages}
                    reload={reload}
                    setMode={setMode}
                    stop={stop}
                  />
                </ErrorBoundary>
              )}
              {mode === 'view' && <QuotedMessage content={part.text} />}

              {mode === 'view' && (
                <MessageControls
                  threadId={threadId}
                  messages={messages}
                  content={part.text}
                  message={message}
                  setMode={setMode}
                  setMessages={setMessages}
                  append={append}
                  reload={reload}
                  stop={stop}
                  isVisible={mobileControlsVisible}
                  onToggleVisibility={() => setMobileControlsVisible(!mobileControlsVisible)}
                />
              )}
            </div>
          ) : (
            <div
              key={key}
              className={cn(
                'group flex flex-col gap-2 w-full px-2 sm:px-0',
                isMobile && 'cursor-pointer'
              )}
              onClick={handleMobileMessageClick}
            >
              <SelectableText messageId={message.id} disabled={isStreaming}>
                <MarkdownRenderer content={part.text} streaming={isStreaming} />
              </SelectableText>
              {attachments && attachments.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {attachments.map((a, index) =>
                    a.type.startsWith('image') ? (
                      <img
                        key={`${a.id}-${index}`}
                        src={a.url}
                        className="h-24 w-24 rounded cursor-pointer hover:scale-105 transition"
                        onClick={() => setLightbox({
                          url: a.url,
                          name: a.name,
                          type: a.type,
                          size: a.size,
                        })}
                        loading="eager"
                        decoding="async"
                        alt={a.name}
                      />
                    ) : (
                      <a
                        key={`${a.id}-${index}`}
                        href={a.url}
                        target="_blank"
                        className="h-10 w-28 bg-muted rounded flex flex-col items-center justify-center text-[10px] px-1 hover:bg-accent"
                      >
                        <span className="line-clamp-1">{a.name}</span>
                        <span className="text-muted-foreground">{a.ext}</span>
                      </a>
                    )
                  )}
                </div>
              )}
              {!isStreaming && (
                <MessageControls
                  threadId={threadId}
                  messages={messages}
                  content={part.text}
                  message={message}
                  setMessages={setMessages}
                  append={append}
                  reload={reload}
                  stop={stop}
                  isVisible={mobileControlsVisible}
                  onToggleVisibility={() => setMobileControlsVisible(!mobileControlsVisible)}
                />
              )}
            </div>
          );
        }

        if (type === 'tool-invocation') {
          const inv = part.toolInvocation as any;
          if (!inv) return null;
          if (inv.state === 'call' || inv.state === 'result') {
            return null;
          }
        }

      })}
    </div>
    {lightbox && (
      <ImageModal
        isOpen={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        imageUrl={lightbox!.url}
        fileName={lightbox!.name}
        fileType={lightbox!.type}
        fileSize={lightbox!.size}
      />
    )}
    </>
  );
}

const PreviewMessage = memo(PureMessage);

PreviewMessage.displayName = 'PreviewMessage';

export default PreviewMessage;
