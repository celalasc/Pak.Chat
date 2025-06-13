import { memo, useState, useEffect } from 'react';
import MarkdownRenderer from '@/frontend/components/MemoizedMarkdown';
import { cn } from '@/lib/utils';
import { UIMessage } from 'ai';
import equal from 'fast-deep-equal';
import MessageControls from './MessageControls';
import { UseChatHelpers } from '@ai-sdk/react';
import MessageEditor from './MessageEditor';
import MessageReasoning from './MessageReasoning';
import SelectableText from './SelectableText';
import QuotedMessage from './QuotedMessage';
import { Input } from '@/frontend/components/ui/input';
import { Button } from '@/frontend/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/frontend/components/ui/badge';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { v4 as uuidv4 } from 'uuid';
import { createThread } from '@/frontend/dexie/queries';

function PureMessage({
  threadId,
  message,
  setMessages,
  reload,
  isStreaming,
  stop,
}: {
  threadId: string;
  message: UIMessage;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isStreaming: boolean;
  stop: UseChatHelpers['stop'];
}) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const isWelcome = message.id === 'welcome';
  const { keys, setKeys } = useAPIKeyStore();
  const [localKeys, setLocalKeys] = useState(keys);
  useEffect(() => { setLocalKeys(keys); }, [keys]);
  const saveKeys = () => { setKeys(localKeys); toast.success('API keys saved'); };
  const navigate = useNavigate();
  const canChat = useAPIKeyStore(state => state.hasRequiredKeys());
  const handleNewChat = async () => {
    const newId = uuidv4();
    await createThread(newId);
    navigate(`/chat/${newId}`);
  };

  return (
    <div
      role="article"
      className={cn(
        'flex flex-col',
        message.role === 'user' ? 'items-end' : 'items-start'
      )}
    >
      {message.parts.map((part, index) => {
        const { type } = part;
        const key = `message-${message.id}-part-${index}`;

        if (type === 'reasoning') {
          return (
            <MessageReasoning
              key={key}
              reasoning={part.reasoning}
              id={message.id}
            />
          );
        }

        if (type === 'text') {
          if (isWelcome && message.role === 'assistant') {
            return (
              <div key={key} className="w-full px-2 sm:px-0 space-y-4">
                <h3 className="text-base font-semibold">Welcome to Pak.Chat</h3>
                <SelectableText messageId={message.id} disabled>
                  <MarkdownRenderer content={part.text} id={message.id} />
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
                        onChange={e => setLocalKeys(prev => ({ ...prev, [provider]: e.target.value }))}
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
              className="relative group px-4 py-3 rounded-xl bg-secondary border border-secondary-foreground/2 max-w-[90%] sm:max-w-[80%] mx-2 sm:mx-0"
            >
              {mode === 'edit' && (
                <MessageEditor
                  threadId={threadId}
                  message={message}
                  content={part.text}
                  setMessages={setMessages}
                  reload={reload}
                  setMode={setMode}
                  stop={stop}
                />
              )}
              {mode === 'view' && <QuotedMessage content={part.text} />}

              {mode === 'view' && (
                <MessageControls
                  threadId={threadId}
                  content={part.text}
                  message={message}
                  setMode={setMode}
                  setMessages={setMessages}
                  reload={reload}
                  stop={stop}
                />
              )}
            </div>
          ) : (
            <div key={key} className="group flex flex-col gap-2 w-full px-2 sm:px-0">
              <SelectableText messageId={message.id} disabled={isStreaming}>
                <MarkdownRenderer content={part.text} id={message.id} />
              </SelectableText>
              {!isStreaming && (
                <MessageControls
                  threadId={threadId}
                  content={part.text}
                  message={message}
                  setMessages={setMessages}
                  reload={reload}
                  stop={stop}
                />
              )}
            </div>
          );
        }
      })}
    </div>
  );
}

const PreviewMessage = memo(PureMessage, (prevProps, nextProps) => {
  if (prevProps.isStreaming !== nextProps.isStreaming) return false;
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
  return true;
});

PreviewMessage.displayName = 'PreviewMessage';

export default PreviewMessage;
