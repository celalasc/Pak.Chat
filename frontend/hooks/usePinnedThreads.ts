import { useState, useEffect } from 'react';
import { isConvexId } from '@/lib/ids';

const PINNED_THREADS_KEY = 'pak-chat-pinned-threads';

export const usePinnedThreads = () => {
  const [pinnedThreads, setPinnedThreadsState] = useState<Set<string>>(new Set());

  // Load pinned threads from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PINNED_THREADS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const valid = parsed.filter(isConvexId);
        setPinnedThreadsState(new Set(valid));
      }
    } catch (error) {
      console.error('Failed to load pinned threads:', error);
    }
  }, []);

  const setPinnedThreads = (newPinned: Set<string>) => {
    const filtered = new Set([...newPinned].filter(isConvexId));
    setPinnedThreadsState(filtered);
    try {
      localStorage.setItem(PINNED_THREADS_KEY, JSON.stringify(Array.from(filtered)));
    } catch (error) {
      console.error('Failed to save pinned threads:', error);
    }
  };

  const togglePin = (threadId: string) => {
    const newPinned = new Set(pinnedThreads);
    if (newPinned.has(threadId)) {
      newPinned.delete(threadId);
    } else {
      newPinned.add(threadId);
    }
    setPinnedThreads(newPinned);
  };

  return {
    pinnedThreads,
    setPinnedThreads,
    togglePin,
  };
}; 