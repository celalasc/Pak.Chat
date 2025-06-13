"use client";

import { useChat } from '@ai-sdk/react';
import Messages from './Messages';
import ChatInput from './ChatInput';
import ChatHistoryButton from './ChatHistoryButton';
import NewChatButton from './NewChatButton';
import { UIMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { createMessage, createThread } from '@/frontend/dexie/queries';
import { db } from '@/frontend/dexie/db';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import SettingsButton from './SettingsButton';
import ChatNavigationBars from './ChatNavigationBars';
import { useQuoteShortcuts } from '@/frontend/hooks/useQuoteShortcuts';
import { useScrollHide } from '@/frontend/hooks/useScrollHide';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { useUIStore } from '@/frontend/stores/uiStore';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { useEffect, useCallback } from 'react';
import { useParams } from 'react-router';

interface ChatProps {
  threadId: string;
  initialMessages: UIMessage[];
}

export default function Chat({ threadId, initialMessages }: ChatProps) {
  const { keys } = useAPIKeyStore();
  const { selectedModel } = useModelStore();
  const { isMobile } = useIsMobile();
  const scrollHidden = useScrollHide({ threshold: 15 });
  const isEditing = useUIStore((state) => !!state.editingMessageId);
  const { id } = useParams();
  const hasKeys = useAPIKeyStore(state => state.hasRequiredKeys());

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
          }
        ],
      };
      
      try {
        await createMessage(threadId, aiMessage);
      } catch (error) {
        console.error(error);
      }
    },
  });

  useEffect(() => {
    if (!id && initialMessages.length) {
      (async () => {
        await createThread(threadId);
        // Backdate and rename the thread for a proper welcome title
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

  const scrollToMessage = useCallback(
    (messageId: string) => {
      const index = messages.findIndex((m) => m.id === messageId);
      if (index === -1) return;
      const nodes = document.querySelectorAll<HTMLDivElement>('div[role="article"]');
      const target = nodes[index];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [messages]
  );

  return (
    <div className="relative w-full">
      <ChatNavigationBars
        messages={messages}
        scrollToMessage={scrollToMessage}
      />
      <main
        className={`flex flex-col w-full max-w-3xl pt-10 pb-44 mx-auto transition-all duration-300 ease-in-out relative`}
      >
        <Messages
          threadId={threadId}
          messages={messages}
          status={status}
          setMessages={setMessages}
          reload={reload}
          error={error}
          stop={stop}
        />
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
      </main>
      
      {/* Logo in top left with blur background */}
      <div
        className={cn(
          "fixed left-4 top-4 z-20 transition-transform duration-300 ease-in-out",
          isMobile && (scrollHidden || isEditing) && "-translate-x-full opacity-0"
        )}
      >
        <div className="relative">
          {/* Blur background for mobile */}
          {isMobile && (
            <div className="absolute inset-0 -m-2 bg-background/60 backdrop-blur-md rounded-lg" />
          )}
          <Link 
            to="/chat" 
            className="relative text-xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            Pak.Chat
          </Link>
        </div>
      </div>

      {/* Top buttons */}
      <div
        className={cn(
          "fixed right-4 top-4 z-20 flex gap-2 p-1 bg-background/60 backdrop-blur-md rounded-lg border border-border/20 transition-transform duration-300 ease-in-out",
          isMobile && isEditing && "translate-x-full opacity-0",
          isMobile && !isEditing && scrollHidden && "translate-x-[44px]"
        )}
      >
        {hasKeys && <NewChatButton className="backdrop-blur-sm" />}
        <ChatHistoryButton className="backdrop-blur-sm" />
        <SettingsButton className="backdrop-blur-sm" />
      </div>
    </div>
  );
}
