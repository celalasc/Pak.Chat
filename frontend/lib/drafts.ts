import type { UIMessage } from 'ai';

const key = (threadId: string, version: number) => `draft-${threadId}-${version}`;

export function loadDraft(threadId: string, version: number): { input: string; messages: UIMessage[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key(threadId, version));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(threadId: string, version: number, draft: { input: string; messages: UIMessage[] }) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key(threadId, version), JSON.stringify(draft));
  } catch {
    // ignore storage errors
  }
}

export function clearDraft(threadId: string, version: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key(threadId, version));
  } catch {
    // ignore storage errors
  }
}
