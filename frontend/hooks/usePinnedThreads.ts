import { useState, useEffect } from 'react';

const PINNED_THREADS_KEY = 'pak-chat-pinned-threads';

export const usePinnedThreads = () => {
  const [pinnedThreads, setPinnedThreadsState] = useState<Set<string>>(new Set());

  // Load pinned threads from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PINNED_THREADS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPinnedThreadsState(new Set(parsed));
      }
    } catch (error) {
      console.error('Failed to load pinned threads:', error);
    }
  }, []);

  const setPinnedThreads = (newPinned: Set<string>) => {
    setPinnedThreadsState(newPinned);
    try {
      localStorage.setItem(PINNED_THREADS_KEY, JSON.stringify(Array.from(newPinned)));
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