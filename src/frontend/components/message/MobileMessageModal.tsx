import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { UIMessage } from 'ai';
import { UseChatHelpers } from '@ai-sdk/react';
import { Button } from '../ui/button';
import { 
  Dialog, 
  DialogContent,
  DialogTitle
} from '../ui/dialog';
// Simple VisuallyHidden component
const VisuallyHidden = ({ children }: { children: React.ReactNode }) => (
  <span className="sr-only">{children}</span>
);
import { Check, Copy, RefreshCcw, SquarePen, GitBranch } from 'lucide-react';
import { copyText } from '@/lib/copyText';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexId } from '@/lib/ids';
import type { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'next/navigation';

interface MobileMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  message: UIMessage;
  messages: UIMessage[];
  setMessages: UseChatHelpers['setMessages'];
  content: string;
  setMode?: Dispatch<SetStateAction<'view' | 'edit'>>;
  reload: UseChatHelpers['reload'];
  stop: UseChatHelpers['stop'];
  append: UseChatHelpers['append'];
  forceRegeneration: () => void;
}

export default function MobileMessageModal({
  isOpen,
  onClose,
  threadId,
  message,
  messages,
  setMessages,
  content,
  setMode,
  reload,
  stop,
  append,
  forceRegeneration,
}: MobileMessageModalProps) {
  const [copied, setCopied] = useState(false);
  const { hasRequiredKeys, keys } = useAPIKeyStore();
  const { selectedModel, webSearchEnabled } = useModelStore();
  const canChat = hasRequiredKeys();
  const prepareForRegenerate = useMutation(api.messages.prepareForRegeneration);
  const cloneThread = useMutation(api.threads.clone);
  const thread = useQuery(
    api.threads.get,
    isConvexId(threadId) ? { threadId: threadId as Id<'threads'> } : 'skip'
  );
  const router = useRouter();


  // Copy message contents to clipboard
  const handleCopy = useCallback(() => {
    copyText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onClose();
  }, [content, onClose]);

  // Edit message
  const handleEdit = useCallback(() => {
    setMode?.('edit');
    onClose();
  }, [setMode, onClose]);


  // Clone thread
  const handleBranch = useCallback(async () => {
    if (!isConvexId(threadId)) return;
    const title = thread?.title ?? content.slice(0, 30);
    const newId = await cloneThread({
      threadId: threadId as Id<'threads'>,
      title,
    });
    router.push(`/chat/${newId}`);
    onClose();
  }, [threadId, thread?.title, content, cloneThread, router, onClose]);


  // Regenerate message
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

    const messagesUpToParent = messages.slice(0, parentMessageIndex + 1);
    setMessages(messagesUpToParent);
    forceRegeneration();

    await new Promise(resolve => setTimeout(resolve, 50));

    const {
      selectedModel: currentModel,
      webSearchEnabled: currentSearch,
    } = useModelStore.getState();

    reload({
      body: {
        model: currentModel,
        apiKeys: keys,
        threadId,
        search: currentSearch,
      },
    });

    onClose();
  }, [stop, threadId, message.id, messages, setMessages, reload, prepareForRegenerate, keys, forceRegeneration, onClose]);

  return (
    <>
      <Dialog 
        open={isOpen} 
        onOpenChange={onClose}
      >
        <DialogContent 
          className="sm:max-w-md bg-white/10 dark:bg-black/10 backdrop-blur-md border border-white/20 dark:border-gray-600/30 shadow-xl rounded-2xl"
          showCloseButton={false}
        >
          <VisuallyHidden>
            <DialogTitle>Message Actions</DialogTitle>
          </VisuallyHidden>
          
          <div className="flex flex-col gap-2">
            {/* Copy */}
            <Button
              variant="outline"
              onClick={handleCopy}
              className="w-full justify-start"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>

            {/* Edit (only for user messages) */}
            {setMode && canChat && (
              <Button
                variant="outline"
                onClick={handleEdit}
                className="w-full justify-start"
              >
                <SquarePen className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}

            {/* Create branch (only for AI messages) */}
            {message.role === 'assistant' && canChat && (
              <Button
                variant="outline"
                onClick={handleBranch}
                className="w-full justify-start"
              >
                <GitBranch className="w-4 h-4 mr-2" />
                Create branch
              </Button>
            )}


            {/* Regenerate (only for AI messages) */}
            {message.role === 'assistant' && canChat && (
              <Button
                variant="outline"
                onClick={handleRegenerate}
                className="w-full justify-start"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Regenerate ({selectedModel})
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
