/**
 * Хук для асинхронной синхронизации store
 * Обеспечивает неблокирующую инициализацию состояния приложения
 */

import { useEffect, useState, useCallback } from 'react';
import { 
  initAllStoresAsync, 
  onStoresSynced, 
  areStoresSynced 
} from '@/frontend/lib/asyncStoreSync';

interface UseAsyncStoreSyncOptions {
  /** Автоматически инициализировать store при монтировании компонента */
  autoInit?: boolean;
  /** Callback, вызываемый после завершения синхронизации */
  onSyncComplete?: () => void;
  /** Callback, вызываемый при ошибке синхронизации */
  onSyncError?: (error: Error) => void;
}

interface UseAsyncStoreSyncReturn {
  /** Завершена ли синхронизация всех store */
  isSynced: boolean;
  /** Происходит ли синхронизация в данный момент */
  isSyncing: boolean;
  /** Ошибка синхронизации, если есть */
  syncError: Error | null;
  /** Функция для ручного запуска синхронизации */
  initStores: () => Promise<void>;
  /** Функция для сброса состояния синхронизации */
  resetSync: () => void;
}

/**
 * Хук для управления асинхронной синхронизацией store
 */
export function useAsyncStoreSync(options: UseAsyncStoreSyncOptions = {}): UseAsyncStoreSyncReturn {
  const { autoInit = true, onSyncComplete, onSyncError } = options;
  
  const [isSynced, setIsSynced] = useState(areStoresSynced());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);

  // Мемоизированная функция инициализации
  const initStores = useCallback(async () => {
    if (isSyncing || isSynced) {
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      await initAllStoresAsync();
      
      // Проверяем статус синхронизации
      const synced = areStoresSynced();
      setIsSynced(synced);
      
      if (synced && onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      const syncError = error instanceof Error ? error : new Error('Unknown sync error');
      setSyncError(syncError);
      
      if (onSyncError) {
        onSyncError(syncError);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isSynced, onSyncComplete, onSyncError]);

  // Функция сброса состояния
  const resetSync = useCallback(() => {
    setIsSynced(false);
    setIsSyncing(false);
    setSyncError(null);
  }, []);

  // Автоматическая инициализация при монтировании
  useEffect(() => {
    if (autoInit && !isSynced && !isSyncing) {
      initStores();
    }
  }, [autoInit, isSynced, isSyncing, initStores]);

  // Подписка на завершение синхронизации
  useEffect(() => {
    if (!isSynced) {
      const handleSyncComplete = () => {
        setIsSynced(true);
      };
      
      onStoresSynced(handleSyncComplete);
    }
  }, [isSynced]);

  return {
    isSynced,
    isSyncing,
    syncError,
    initStores,
    resetSync,
  };
}