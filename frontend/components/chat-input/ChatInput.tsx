"use client";

import { memo, useCallback, useEffect, useState, useRef } from 'react';
import { UseChatHelpers } from '@ai-sdk/react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import useAutoResizeTextarea from '@/hooks/useAutoResizeTextArea';
import { useDebouncedCallback } from 'use-debounce';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useChatStore } from '@/frontend/stores/ChatStore';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import { useAttachmentsStore } from '@/frontend/stores/AttachmentsStore';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { isConvexId } from '@/lib/ids';
import { cn } from '@/lib/utils';

// Import our modular components
import { DragDropArea } from './components/TextArea/DragDropArea';
import { ChatTextArea } from './components/TextArea/ChatTextArea';
import { ChatModelDropdown } from './components/ModelDropdown/ChatModelDropdown';
import { ImageGenerationControls } from './components/ImageGenerationControls';
import { SendButton, StopButton } from './components/ActionButtons';
import { useChatSubmit } from './hooks/useChatSubmit';
import AttachmentsBar from '../AttachmentsBar';
import QuoteDisplay from '../QuoteDisplay';

interface ChatInputProps {
  threadId: string;
  thread: Doc<'threads'> | null | undefined;
  input: UseChatHelpers['input'];
  status: UseChatHelpers['status'];
  error: UseChatHelpers['error'];
  setInput: UseChatHelpers['setInput'];
  reload: UseChatHelpers['reload'];
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  stop: UseChatHelpers['stop'];
  messageCount: number;
  onThreadCreated?: (id: Id<'threads'>) => void;
}

function PureChatInput({
  threadId,
  thread,
  input,
  status,
  error,
  setInput,
  reload,
  setMessages,
  append,
  stop,
  messageCount,
  onThreadCreated,
}: ChatInputProps) {
  const { isImageGenerationMode, imageGenerationParams, setImageGenerationMode, initializeImageGenerationParams } = useChatStore();
  const { hasRequiredKeys } = useAPIKeyStore();
  const { user } = useAuthStore();
  const { currentQuote, clearQuote } = useQuoteStore();
  const { attachments } = useAttachmentsStore();
  
  // Load user settings for image generation
  const userSettings = useQuery(api.userSettings.get, user ? {} : 'skip');
  const saveDraftMutation = useMutation(api.threads.saveDraft);
  
  const [sessionThreadId, setSessionThreadId] = useState<string | null>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 72,
    maxHeight: 200,
  });

  // Track the created thread only when the incoming threadId changes
  useEffect(() => {
    if (isConvexId(threadId)) {
      setSessionThreadId(threadId);
    } else {
      setSessionThreadId(null);
    }
  }, [threadId]);

  // Tracks whether the initial draft for the current thread has been loaded.
  // This prevents later updates from overwriting user input while still
  // ensuring the draft is populated once when switching threads.
  const initialDraftLoadedRef = useRef(false);

  // Reset the flag whenever the thread changes and clear the input immediately
  // so stale text from a previous thread doesn't remain visible.
  useEffect(() => {
    initialDraftLoadedRef.current = false;
    setInput('');
    adjustHeight(true);
  }, [threadId]);

  // When the draft for the current thread becomes available for the first time,
  // populate the input field and mark it as loaded. Subsequent updates are
  // ignored to avoid clobbering the user's typing.
  useEffect(() => {
    if (!initialDraftLoadedRef.current && typeof thread?.draft === 'string') {
      setInput(thread.draft);
      adjustHeight();
      initialDraftLoadedRef.current = true;
    }
  }, [thread?.draft, setInput, adjustHeight]);

  // Initialize image generation parameters from user settings
  useEffect(() => {
    if (userSettings) {
      const defaultParams = {
        quality: (userSettings.imageGenerationQuality as 'auto' | 'low' | 'medium' | 'high') || 'auto',
        size: (userSettings.imageGenerationSize as 'auto' | '1024x1024' | '1024x1536' | '1536x1024') || 'auto',
        count: (userSettings.imageGenerationCount as 1 | 2 | 3 | 4) || 1,
        format: (userSettings.imageGenerationFormat as 'png' | 'jpeg' | 'webp') || 'jpeg',
        compression: userSettings.imageGenerationCompression || 80,
      };
      initializeImageGenerationParams(defaultParams);
    }
  }, [userSettings, initializeImageGenerationParams]);

  // Debounced draft saver to reduce server load
  const debouncedSaveDraft = useDebouncedCallback((draftText: string) => {
    const currentThreadId = sessionThreadId || threadId;
    if (isConvexId(currentThreadId)) {
      saveDraftMutation({ threadId: currentThreadId as Id<'threads'>, draft: draftText });
    }
  }, 500);

  // Chat submit hook with all the complex logic
  const { handleSubmit, isSubmitting, canChat, textareaRef: submitTextareaRef } = useChatSubmit({
    threadId,
    sessionThreadId,
    setSessionThreadId,
    input,
    setInput,
    append,
    clearQuote,
    adjustHeight,
    onThreadCreated,
  });

  // Combine refs
  const combinedRef = useCallback((node: HTMLTextAreaElement) => {
    if (textareaRef) {
      textareaRef.current = node;
    }
    if (submitTextareaRef) {
      submitTextareaRef.current = node;
    }
  }, [textareaRef, submitTextareaRef]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape' && isImageGenerationMode) {
        e.preventDefault();
        setImageGenerationMode(false);
      }
    },
    [handleSubmit, isImageGenerationMode, setImageGenerationMode]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInput(newValue);
      adjustHeight();
      debouncedSaveDraft(newValue);
    },
    [setInput, adjustHeight, debouncedSaveDraft]
  );

  // Global Escape handler for image generation mode
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isImageGenerationMode) {
        const hasOpenModal = document.querySelector('[role="dialog"]') || 
                            document.querySelector('.modal') ||
                            document.querySelector('[data-state="open"]') ||
                            document.querySelector('.fixed.inset-0');
        
        const isInChatArea = textareaRef.current?.contains(document.activeElement) ||
                            document.activeElement === textareaRef.current ||
                            document.activeElement === document.body;
        
        if (!hasOpenModal && isInChatArea) {
          e.preventDefault();
          setImageGenerationMode(false);
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isImageGenerationMode, setImageGenerationMode, textareaRef]);

  const isDisabled = !input.trim() || status === 'streaming' || status === 'submitted' || isSubmitting || !canChat;

  return (
    <div className="w-full flex justify-center pb-safe mobile-keyboard-fix">
      <DragDropArea messageCount={messageCount}>
        <div className="relative rounded-[16px] sm:rounded-[24px] overflow-hidden bg-white dark:bg-transparent">
          <div className="flex flex-col">
            {/* Attachments at the top */}
            {attachments.length > 0 && (
              <div className="bg-white dark:bg-secondary px-4 pt-3">
                <AttachmentsBar mode="full" />
              </div>
            )}
            
            {/* Quote display */}
            {currentQuote && (
              <div className="bg-white dark:bg-secondary px-4 pt-3">
                <QuoteDisplay quote={currentQuote} onRemove={clearQuote} />
              </div>
            )}
            
            {/* Text input */}
            <div className="bg-white dark:bg-secondary overflow-y-auto max-h-[300px]">
              <ChatTextArea
                ref={combinedRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={!canChat}
                isImageGenerationMode={isImageGenerationMode}
                aria-describedby="chat-input-description"
              />
              <span id="chat-input-description" className="sr-only">
                {isImageGenerationMode 
                  ? 'Describe image to generate, Press Enter to create' 
                  : 'Press Enter to send, Shift+Enter for new line'}
              </span>
            </div>
          </div>
          
          {/* Bottom controls */}
          <div className="h-14 flex items-center px-2 bg-white dark:bg-transparent">
            <div className="flex items-center justify-between w-full gap-2 overflow-x-auto">
              {/* Left side: Add file button and model selection */}
              <div className="flex items-center gap-2">
                <AttachmentsBar mode="compact" messageCount={messageCount} />
                <ChatModelDropdown messageCount={messageCount} />
                {isImageGenerationMode && <ImageGenerationControls />}
              </div>
              
              {/* Right side: Send/Stop button */}
              <div className="flex items-center gap-2">
                {status === 'submitted' || status === 'streaming' ? (
                  <StopButton stop={stop} />
                ) : (
                  <SendButton onSubmit={handleSubmit} disabled={isDisabled} />
                )}
              </div>
            </div>
          </div>
        </div>
      </DragDropArea>
    </div>
  );
}

const ChatInput = memo(PureChatInput, (prevProps, nextProps) => {
  return (
    prevProps.input === nextProps.input &&
    prevProps.status === nextProps.status &&
    prevProps.messageCount === nextProps.messageCount
  );
});
ChatInput.displayName = 'ChatInput';

function ChatInputWrapper(props: ChatInputProps) {
  return <ChatInput {...props} />;
}

export default ChatInputWrapper;
