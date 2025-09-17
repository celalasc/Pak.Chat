"use client";

import React, { Suspense } from 'react';
import { Doc, Id } from '@/convex/_generated/dataModel';
import type { UIMessage } from 'ai';
import { Skeleton } from '@/frontend/components/ui/skeleton';

// Lazy load ChatView component
const ChatView = React.lazy(() => import('../ChatView'));

interface LazyChatViewProps {
  threadId: string;
  thread: Doc<'threads'> | null | undefined;
  initialMessages: UIMessage[];
  showNavBars: boolean;
  onThreadCreated?: (newThreadId: string) => void;
  projectId?: Id<"projects">;
  project?: Doc<"projects">;
  customLayout?: boolean;
  projectLayout?: boolean;
  projectHeader?: React.ReactNode;
}

// Skeleton component for ChatView loading state
function ChatViewSkeleton() {
  return (
    <div className="flex flex-col h-full space-y-4 p-4">
      {/* Messages area skeleton */}
      <div className="flex-1 space-y-4">
        {/* User message skeleton */}
        <div className="flex justify-end">
          <div className="max-w-[80%] space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
        
        {/* Assistant message skeleton */}
        <div className="flex justify-start">
          <div className="max-w-[80%] space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
        
        {/* Another user message skeleton */}
        <div className="flex justify-end">
          <div className="max-w-[80%] space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
      
      {/* Chat input skeleton */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-32" /> {/* Model dropdown */}
          <Skeleton className="h-8 w-8" />   {/* Settings button */}
        </div>
        <div className="relative">
          <Skeleton className="h-20 w-full rounded-lg" /> {/* Text area */}
          <div className="absolute bottom-2 right-2">
            <Skeleton className="h-8 w-8 rounded-full" /> {/* Send button */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LazyChatView(props: LazyChatViewProps) {
  const hasMessages = props.initialMessages && props.initialMessages.length > 0;

  return (
    <Suspense fallback={hasMessages ? null : <ChatViewSkeleton />}>
      <ChatView {...props} />
    </Suspense>
  );
}

export { ChatViewSkeleton };