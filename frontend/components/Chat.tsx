"use client";

import { useChat } from '@ai-sdk/react';
import Messages from './Messages';
import ChatInput from './ChatInput';
import ChatHistoryButton from './ChatHistoryButton';
import NewChatButton from './NewChatButton';
import { UIMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import SettingsButton from './SettingsButton';
import { useQuoteShortcuts } from '@/frontend/hooks/useQuoteShortcuts';
import { useScrollHide } from '@/frontend/hooks/useScrollHide';
import { useIsMobile } from '@/frontend/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface ChatProps {
  threadId: string;
  initialMessages: UIMessage[];
}

export default function Chat({ threadId, initialMessages }: ChatProps) {
  const { keys, hasRequiredKeys, keysLoading } = useAPIKeyStore();
  const { selectedModel } = useModelStore();
  const { isMobile } = useIsMobile();
  const isHeaderVisible = useScrollHide({ threshold: 15 });
  const { id } = useParams();
  const sendMessage = useMutation(api.messages.send);
  const hasKeys = useMemo(() => hasRequiredKeys(), [hasRequiredKeys]);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useQuoteShortcuts();

  // Отслеживание видимости клавиатуры на мобильных устройствах
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const heightDifference = windowHeight - viewportHeight;
      
      // Если разница больше 150px, считаем что клавиатура открыта
      setIsKeyboardVisible(heightDifference > 150);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMobile]);

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
      await sendMessage({
        threadId: threadId as Id<'threads'>,
        role: 'assistant',
        content: message.content,
      });
    },
  });

  useEffect(() => {
    // TODO: migrate initial thread creation to Convex
  }, [id, initialMessages, threadId]);

  return (
    <div className="relative w-full">
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
      <div className={cn(
        "fixed left-4 top-4 z-20 transition-all duration-300 ease-in-out",
        isMobile && (!isHeaderVisible || isKeyboardVisible) && "transform -translate-x-full opacity-0"
      )}>
        <div className="relative">
          {/* Blur background for mobile */}
          {isMobile && (
            <div className="absolute inset-0 -m-2 bg-background/60 backdrop-blur-md rounded-lg" />
          )}
          <span 
            className="relative text-xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
            onClick={() => window.location.href = '/chat'}
          >
            Pak.Chat
          </span>
        </div>
      </div>

      {/* Top buttons */}
      <div className={cn(
        "fixed right-4 top-4 z-20 flex gap-2 p-1 bg-background/60 backdrop-blur-md rounded-lg border border-border/20 transition-transform duration-300 ease-in-out",
        isMobile && (!isHeaderVisible || isKeyboardVisible) && "translate-x-full opacity-0"
      )}>
        {!keysLoading && hasKeys && (
          <NewChatButton className="backdrop-blur-sm" />
        )}
        <ChatHistoryButton className="backdrop-blur-sm" />
        <SettingsButton className="backdrop-blur-sm" />
      </div>
    </div>
  );
}
