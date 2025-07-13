import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { isConvexId } from '@/lib/ids';
import { useMemo } from 'react';

export function useConvexMessages(threadId: string) {
  // Мемоизируем условие для запроса
  const shouldQuery = useMemo(() => 
    isConvexId(threadId), 
    [threadId]
  );

  const messages = useQuery(
    api.messages.get,
    shouldQuery ? { threadId: threadId as Id<'threads'> } : 'skip'
  );

  // Мемоизируем результат
  return useMemo(() => messages || [], [messages]);
} 