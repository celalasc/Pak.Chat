"use client";

import { useChat } from '@ai-sdk/react';
import { memo } from 'react';
import Messages from './Messages';
import ChatInput from './ChatInput';
import ChatHistoryButton from './ChatHistoryButton';
import NewChatButton from './NewChatButton';
import SettingsButton from './SettingsButton';
import { Link } from 'react-router';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/frontend/stores/uiStore';
import { useScrollHideRef } from '@/frontend/hooks/useScrollHide';
import { motion, type Transition, easeInOut } from 'framer-motion';
// additional imports from previous version
import { UIMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { createMessage, createThread } from '@/frontend/dexie/queries';
import { db } from '@/frontend/dexie/db';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { useQuoteShortcuts } from '@/frontend/hooks/useQuoteShortcuts';
import { useEffect } from 'react';
import { useParams } from 'react-router';

interface ChatProps {
  threadId: string;
  initialMessages: UIMessage[];
}

function ChatComponent({ threadId, initialMessages }: ChatProps) {
  // existing hooks
  const keys = useAPIKeyStore((state) => state.keys);
  const { selectedModel } = useModelStore();
  const { isMobile } = useIsMobile();
  const scrollHiddenRef = useScrollHideRef();
  const isEditing = useUIStore((state) => !!state.editingMessageId);
  const shouldHideHeader = scrollHiddenRef.current || isEditing;
  const { id } = useParams();
  const hasKeys = useAPIKeyStore((state) => state.hasRequiredKeys());

  useQuoteShortcuts();

  const {
    messages,
    input,
    setInput,
    append,
    setMessages,
    reload,
    stop,
    status,
    error,
  } = useChat({
    id: threadId,
    initialMessages,
    body: {
      apiKeys: keys,
      model: selectedModel,
    },
    onFinish: async (message) => {
      const aiMessage: UIMessage = {
        id: uuidv4(),
        role: message.role,
        content: message.content,
        createdAt: new Date(),
        parts: [
          {
            type: 'text',
            text: message.content,
          },
        ],
      };

      try {
        await createMessage(threadId, aiMessage);
      } catch (err) {
        console.error(err);
      }
    },
  });

  useEffect(() => {
    if (!id && initialMessages.length) {
      (async () => {
        await createThread(threadId);
        const ts = initialMessages[0].createdAt;
        await db.threads.update(threadId, {
          title: 'Welcome',
          createdAt: ts,
          updatedAt: ts,
          lastMessageAt: ts,
        });
        for (const msg of initialMessages) {
          await createMessage(threadId, msg);
        }
      })();
    }
  }, [id, initialMessages, threadId]);


  // framer-motion animation settings
  // Animation states for header controls
  const animationVariants = {
    visible: { opacity: 1, x: 0, y: 0 },
    hiddenLeft: { opacity: 0, x: '-110%' },
    hiddenRight: { opacity: 0, x: '110%' },
    fade: { opacity: 0, x: 0 }, // fades out without horizontal shift
  } as const;
  const transition: Transition = { duration: 0.3, ease: easeInOut };

  return (
    <div className={cn(
      "w-full flex flex-col overflow-hidden h-screen mobile-vh"
    )}>
      <header className="relative z-20 shrink-0">
        <div className="fixed left-4 right-4 top-4 flex items-center gap-x-1">
          <motion.div
            initial="visible"
            animate={isMobile && shouldHideHeader ? 'hiddenLeft' : 'visible'}
            variants={animationVariants}
            transition={transition}
          >
            <Link to="/chat" className="text-xl font-bold">
              Pak.Chat
            </Link>
          </motion.div>

          <div className="ml-auto flex items-center gap-x-1">
            <motion.div initial="visible" animate="visible" transition={transition}>
              {hasKeys && <NewChatButton />}
            </motion.div>
            <motion.div initial="visible" animate="visible" transition={transition}>
              <ChatHistoryButton />
            </motion.div>
            <motion.div
              initial="visible"
              animate={
                isMobile && isEditing
                  ? 'hiddenRight'
                  : isMobile && scrollHidden
                    ? 'fade'
                    : 'visible'
              }
              variants={animationVariants}
              transition={transition}
            >
              <SettingsButton />
            </motion.div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-3xl pt-20 pb-44 mx-auto overflow-y-auto">
        <Messages
          threadId={threadId}
          messages={messages}
          status={status}
          setMessages={setMessages}
          reload={reload}
          error={error}
          stop={stop}
        />
      </main>

      <ChatInput
        threadId={threadId}
        input={input}
        status={status}
        append={append}
        setInput={setInput}
        stop={stop}
        messageCount={messages.length}
        error={error}
      />
    </div>
  );
}

const Chat = memo(ChatComponent);

export default Chat;
