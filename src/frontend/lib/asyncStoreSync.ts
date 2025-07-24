/**
 * Асинхронная синхронизация store для улучшения производительности
 * Этот модуль обеспечивает неблокирующую инициализацию и синхронизацию состояния
 */

import { useAuthStore } from '@/frontend/stores/AuthStore';
import { useSettingsStore } from '@/frontend/stores/SettingsStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { useModelVisibilityStore } from '@/frontend/stores/ModelVisibilityStore';
import { useCustomModesStore } from '@/frontend/stores/CustomModesStore';

// Типы для отслеживания состояния синхронизации
interface SyncState {
  auth: boolean;
  settings: boolean;
  models: boolean;
  modelVisibility: boolean;
  customModes: boolean;
}

// Глобальное состояние синхронизации
let syncState: SyncState = {
  auth: false,
  settings: false,
  models: false,
  modelVisibility: false,
  customModes: false,
};

// Callbacks для уведомления о завершении синхронизации
const syncCallbacks: Array<() => void> = [];

/**
 * Проверяет, завершена ли синхронизация всех store
 */
function checkSyncComplete(): boolean {
  return Object.values(syncState).every(Boolean);
}

/**
 * Уведомляет о завершении синхронизации
 */
function notifySyncComplete() {
  if (checkSyncComplete()) {
    syncCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in sync callback:', error);
      }
    });
    syncCallbacks.length = 0; // Очищаем callbacks
  }
}

/**
 * Асинхронная инициализация AuthStore
 */
export async function initAuthStoreAsync(): Promise<void> {
  return new Promise((resolve) => {
    // Используем scheduler API если доступен, иначе setTimeout
    const scheduleTask = (task: () => void) => {
      if ('scheduler' in window && (window as any).scheduler?.postTask) {
        (window as any).scheduler.postTask(task, { priority: 'background' });
      } else {
        setTimeout(task, 0);
      }
    };

    scheduleTask(() => {
      try {
        const authStore = useAuthStore.getState();
        // Инициализация уже происходит в AuthListener, просто отмечаем как готовое
        syncState.auth = true;
        notifySyncComplete();
        resolve();
      } catch (error) {
        console.error('Error initializing AuthStore:', error);
        syncState.auth = true; // Отмечаем как готовое даже при ошибке
        notifySyncComplete();
        resolve();
      }
    });
  });
}

/**
 * Асинхронная инициализация SettingsStore
 */
export async function initSettingsStoreAsync(): Promise<void> {
  return new Promise((resolve) => {
    const scheduleTask = (task: () => void) => {
      if ('scheduler' in window && (window as any).scheduler?.postTask) {
        (window as any).scheduler.postTask(task, { priority: 'background' });
      } else {
        setTimeout(task, 0);
      }
    };

    scheduleTask(() => {
      try {
        const settingsStore = useSettingsStore.getState();
        // Настройки инициализируются автоматически через zustand/persist
        // Просто отмечаем как готовые после инициализации store
        syncState.settings = true;
        notifySyncComplete();
        resolve();
      } catch (error) {
        console.error('Error initializing SettingsStore:', error);
        syncState.settings = true;
        notifySyncComplete();
        resolve();
      }
    });
  });
}

/**
 * Асинхронная инициализация ModelStore
 */
export async function initModelStoreAsync(): Promise<void> {
  return new Promise((resolve) => {
    const scheduleTask = (task: () => void) => {
      if ('scheduler' in window && (window as any).scheduler?.postTask) {
        (window as any).scheduler.postTask(task, { priority: 'background' });
      } else {
        setTimeout(task, 0);
      }
    };

    scheduleTask(() => {
      try {
        const modelStore = useModelStore.getState();
        // Инициализация модели происходит автоматически
        syncState.models = true;
        notifySyncComplete();
        resolve();
      } catch (error) {
        console.error('Error initializing ModelStore:', error);
        syncState.models = true;
        notifySyncComplete();
        resolve();
      }
    });
  });
}

/**
 * Асинхронная инициализация ModelVisibilityStore
 */
export async function initModelVisibilityStoreAsync(): Promise<void> {
  return new Promise((resolve) => {
    const scheduleTask = (task: () => void) => {
      if ('scheduler' in window && (window as any).scheduler?.postTask) {
        (window as any).scheduler.postTask(task, { priority: 'background' });
      } else {
        setTimeout(task, 0);
      }
    };

    scheduleTask(() => {
      try {
        const modelVisibilityStore = useModelVisibilityStore.getState();
        // Инициализация происходит автоматически
        syncState.modelVisibility = true;
        notifySyncComplete();
        resolve();
      } catch (error) {
        console.error('Error initializing ModelVisibilityStore:', error);
        syncState.modelVisibility = true;
        notifySyncComplete();
        resolve();
      }
    });
  });
}

/**
 * Асинхронная инициализация CustomModesStore
 */
export async function initCustomModesStoreAsync(): Promise<void> {
  return new Promise((resolve) => {
    const scheduleTask = (task: () => void) => {
      if ('scheduler' in window && (window as any).scheduler?.postTask) {
        (window as any).scheduler.postTask(task, { priority: 'background' });
      } else {
        setTimeout(task, 0);
      }
    };

    scheduleTask(() => {
      try {
        const customModesStore = useCustomModesStore.getState();
        // Инициализация происходит автоматически
        syncState.customModes = true;
        notifySyncComplete();
        resolve();
      } catch (error) {
        console.error('Error initializing CustomModesStore:', error);
        syncState.customModes = true;
        notifySyncComplete();
        resolve();
      }
    });
  });
}

/**
 * Инициализирует все store асинхронно и неблокирующе
 */
export async function initAllStoresAsync(): Promise<void> {
  // Сбрасываем состояние синхронизации
  syncState = {
    auth: false,
    settings: false,
    models: false,
    modelVisibility: false,
    customModes: false,
  };

  // Запускаем все инициализации параллельно
  const initPromises = [
    initAuthStoreAsync(),
    initSettingsStoreAsync(),
    initModelStoreAsync(),
    initModelVisibilityStoreAsync(),
    initCustomModesStoreAsync(),
  ];

  try {
    await Promise.allSettled(initPromises);
  } catch (error) {
    console.error('Error during store initialization:', error);
  }
}

/**
 * Добавляет callback, который будет вызван после завершения синхронизации всех store
 */
export function onStoresSynced(callback: () => void): void {
  if (checkSyncComplete()) {
    // Если синхронизация уже завершена, вызываем callback немедленно
    try {
      callback();
    } catch (error) {
      console.error('Error in immediate sync callback:', error);
    }
  } else {
    // Иначе добавляем в очередь
    syncCallbacks.push(callback);
  }
}

/**
 * Проверяет, завершена ли синхронизация всех store
 */
export function areStoresSynced(): boolean {
  return checkSyncComplete();
}

/**
 * Сбрасывает состояние синхронизации (для тестирования)
 */
export function resetSyncState(): void {
  syncState = {
    auth: false,
    settings: false,
    models: false,
    modelVisibility: false,
    customModes: false,
  };
  syncCallbacks.length = 0;
}