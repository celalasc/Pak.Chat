import type { UIMessage } from 'ai';

// Ensure new chats use a stable key so old drafts don't reappear
const key = (threadId: string) => `draft-${threadId || 'new'}`;

export function loadDraft(threadId: string): { input: string; messages: UIMessage[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key(threadId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(threadId: string, draft: { input: string; messages: UIMessage[] }) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key(threadId), JSON.stringify(draft));
  } catch {
    // ignore storage errors
  }
}

export function clearDraft(threadId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key(threadId));
  } catch {
    // ignore storage errors
  }
}
