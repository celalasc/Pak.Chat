"use client";

import React, { Suspense } from 'react';
import { UseChatHelpers } from '@ai-sdk/react';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { Skeleton } from '@/frontend/components/ui/skeleton';

// Lazy load ChatInput component
const ChatInput = React.lazy(() => import('../chat-input/ChatInput'));

interface LazyChatInputProps {
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
  projectId?: Id<'projects'>;
  sessionThreadId?: string | undefined;
  setSessionThreadId?: (id: string | undefined) => void;
}

// Skeleton component for ChatInput loading state
function ChatInputSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {/* Model dropdown and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-40" /> {/* Model dropdown */}
          <Skeleton className="h-8 w-8" />   {/* Settings button */}
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-20" /> {/* Web search toggle */}
          <Skeleton className="h-8 w-8" />   {/* Image generation toggle */}
        </div>
      </div>
      
      {/* Attachments bar skeleton */}
      <div className="flex items-center space-x-2">
        <Skeleton className="h-6 w-6" /> {/* Attachment icon */}
        <Skeleton className="h-4 w-32" /> {/* Attachment text */}
      </div>
      
      {/* Quote display skeleton */}
      <div className="bg-muted/30 rounded-lg p-3 space-y-2">
        <Skeleton className="h-4 w-24" /> {/* Quote header */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      
      {/* Main input area */}
      <div className="relative">
        <div className="border border-border rounded-lg p-3 space-y-2">
          {/* Textarea skeleton */}
          <Skeleton className="h-16 w-full" />
          
          {/* Bottom controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-6" /> {/* Attachment button */}
              <Skeleton className="h-6 w-6" /> {/* Emoji button */}
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-16" /> {/* Character count */}
              <Skeleton className="h-8 w-8 rounded-full" /> {/* Send button */}
            </div>
          </div>
        </div>
      </div>
      
      {/* Image generation controls skeleton */}
      <div className="bg-primary/5 rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" /> {/* Image generation title */}
          <Skeleton className="h-6 w-12" /> {/* Toggle switch */}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" /> {/* Quality label */}
            <Skeleton className="h-8 w-full" /> {/* Quality dropdown */}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" /> {/* Size label */}
            <Skeleton className="h-8 w-full" /> {/* Size dropdown */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LazyChatInput(props: LazyChatInputProps) {
  // Не показываем скелетон если есть активность (отправка сообщений или стриминг)
  const hasActivity = props.status === 'streaming' || props.status === 'submitted' || props.messageCount > 0;
  
  return (
    <Suspense fallback={hasActivity ? null : <ChatInputSkeleton />}>
      <ChatInput {...props} />
    </Suspense>
  );
}

export { ChatInputSkeleton };