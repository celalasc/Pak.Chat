"use client";

import React, { Suspense } from 'react';
import { UIMessage } from 'ai';
import { UseChatHelpers } from '@ai-sdk/react';
import { Skeleton } from '@/frontend/components/ui/skeleton';

// Lazy load Messages component
const Messages = React.lazy(() => import('../message/Messages'));

interface LazyMessagesProps {
  threadId: string;
  messages: UIMessage[];
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  append: UseChatHelpers['append'];
  status: UseChatHelpers['status'];
  error: UseChatHelpers['error'];
  stop: UseChatHelpers['stop'];
  forceRegeneration: () => void;
  isRegenerating: boolean;
  isFirstMessagePending?: boolean;
  scrollRef?: React.Ref<HTMLDivElement>;
}

// Skeleton component for Messages loading state
function MessagesSkeleton() {
  return (
    <section className="flex flex-col space-y-12">
      {/* First message skeleton */}
      <div className="flex justify-end">
        <div className="max-w-[80%] space-y-2">
          <Skeleton className="h-4 w-16" /> {/* Timestamp */}
          <div className="bg-primary/10 rounded-lg p-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
      
      {/* Second message skeleton */}
      <div className="flex justify-start">
        <div className="max-w-[80%] space-y-2">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" /> {/* Avatar */}
            <Skeleton className="h-4 w-20" /> {/* Name */}
            <Skeleton className="h-4 w-16" /> {/* Timestamp */}
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
      
      {/* Third message skeleton */}
      <div className="flex justify-end">
        <div className="max-w-[80%] space-y-2">
          <Skeleton className="h-4 w-16" /> {/* Timestamp */}
          <div className="bg-primary/10 rounded-lg p-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LazyMessages(props: LazyMessagesProps) {
  return (
    <Suspense fallback={<MessagesSkeleton />}>
      <Messages {...props} />
    </Suspense>
  );
}

export { MessagesSkeleton };