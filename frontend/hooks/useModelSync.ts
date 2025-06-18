import { useEffect, useRef } from 'react';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { useModelVisibilityStore } from '@/frontend/stores/ModelVisibilityStore';
import { useModelVisibilitySync } from './useModelVisibilitySync';
import { useConvexAuth } from 'convex/react';

export function useModelSync() {
  const { isAuthenticated } = useConvexAuth();
  const { selectedModel: localSelectedModel, syncSelectedModel } = useModelStore();
  const { selectedModel: convexSelectedModel, setSelectedModel } = useModelVisibilityStore();
  const { saveToConvex } = useModelVisibilitySync();
  
  const isInitialized = useRef(false);
  const lastSynced = useRef<string | null>(null);

  // Синхронизация из Convex в локальное хранилище при первой загрузке
  useEffect(() => {
    if (isAuthenticated && convexSelectedModel && !isInitialized.current) {
      if (localSelectedModel !== convexSelectedModel) {
        syncSelectedModel(convexSelectedModel);
        lastSynced.current = convexSelectedModel;
      }
      isInitialized.current = true;
    }
  }, [isAuthenticated, convexSelectedModel, localSelectedModel, syncSelectedModel]);

  // Синхронизация изменений локальной модели в Convex
  useEffect(() => {
    if (isAuthenticated && isInitialized.current && localSelectedModel !== lastSynced.current) {
      setSelectedModel(localSelectedModel);
      saveToConvex();
      lastSynced.current = localSelectedModel;
    }
  }, [isAuthenticated, localSelectedModel, setSelectedModel, saveToConvex]);

  // Синхронизация изменений из Convex в локальное хранилище
  useEffect(() => {
    if (isAuthenticated && isInitialized.current && convexSelectedModel !== lastSynced.current) {
      syncSelectedModel(convexSelectedModel);
      lastSynced.current = convexSelectedModel;
    }
  }, [isAuthenticated, convexSelectedModel, syncSelectedModel]);
} 