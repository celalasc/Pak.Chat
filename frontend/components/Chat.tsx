"use client";

import { useChat } from '@ai-sdk/react';
import { memo } from 'react';
import Messages from './Messages';
import ChatInput from './ChatInput';
import ChatHeader from './ChatHeader';
import { cn } from '@/lib/utils';
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
  const { id } = useParams();

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



  return (
    <div className={cn(
      "w-full flex flex-col overflow-hidden h-screen mobile-vh"
    )}>
      <ChatHeader />

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
