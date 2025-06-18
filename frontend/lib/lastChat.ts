export const LAST_CHAT_KEY = 'last-chat-id';

export function saveLastChatId(id: string) {
  try {
    localStorage.setItem(LAST_CHAT_KEY, id);
  } catch {
    // ignore
  }
}

export function getLastChatId(): string | null {
  try {
    return localStorage.getItem(LAST_CHAT_KEY);
  } catch {
    return null;
  }
}

export function clearLastChatId() {
  try {
    localStorage.removeItem(LAST_CHAT_KEY);
  } catch {
    // ignore
  }
}

