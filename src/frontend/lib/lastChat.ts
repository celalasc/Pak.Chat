export const LAST_CHAT_KEY = 'last-chat-id';
export const LAST_PATH_KEY = 'last-path';
export const SESSION_KEY = 'session-active';

// Сохраняем ID последнего чата
export function saveLastChatId(id: string) {
  try {
    localStorage.setItem(LAST_CHAT_KEY, id);
  } catch {
    // ignore
  }
}

// Получаем ID последнего чата
export function getLastChatId(): string | null {
  try {
    return localStorage.getItem(LAST_CHAT_KEY);
  } catch {
    return null;
  }
}

// Очищаем ID последнего чата
export function clearLastChatId() {
  try {
    localStorage.removeItem(LAST_CHAT_KEY);
  } catch {
    // ignore
  }
}

// Сохраняем последний путь
export function saveLastPath(path: string) {
  try {
    localStorage.setItem(LAST_PATH_KEY, path);
    // Отмечаем что сессия активна
    sessionStorage.setItem(SESSION_KEY, 'true');
  } catch {
    // ignore
  }
}

// Получаем последний путь
export function getLastPath(): string | null {
  try {
    return localStorage.getItem(LAST_PATH_KEY);
  } catch {
    return null;
  }
}

// Проверяем, это перезагрузка или новый заход
export function isReload(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

// Очищаем данные сессии
export function clearSession() {
  try {
    localStorage.removeItem(LAST_PATH_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

