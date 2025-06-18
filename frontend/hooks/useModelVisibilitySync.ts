import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useModelVisibilityStore } from '@/frontend/stores/ModelVisibilityStore';

export function useModelVisibilitySync() {
  const { isAuthenticated } = useConvexAuth();
  const store = useModelVisibilityStore; // ссылка на стор
  const {
    syncWithConvex,
    setLoading,
  } = store();

  const isSavingRef = useRef(false);

  // Fetch model visibility settings from Convex
  const visibilityData = useQuery(
    api.modelVisibility.getModelVisibility,
    isAuthenticated ? {} : 'skip'
  );
  const saveVisibility = useMutation(api.modelVisibility.setModelVisibility);

  // Sync data from Convex to local store
  useEffect(() => {
    if (visibilityData) {
      syncWithConvex(visibilityData);
    } else if (visibilityData === null) {
      setLoading(false);
    }
  }, [visibilityData, syncWithConvex, setLoading]);

  // Save changes to Convex immediately without debouncing
  const saveToConvex = useCallback(async () => {
    if (!isAuthenticated || isSavingRef.current) return;

    const { favoriteModels, enabledProviders, selectedModel } = store.getState();

    isSavingRef.current = true;
    try {
      await saveVisibility({
        favoriteModels: [...favoriteModels], // клонируем массив для новой ссылки
        enabledProviders: [...enabledProviders], // клонируем массив для новой ссылки
        selectedModel,
      });
    } catch (error) {
      console.error('Failed to save model visibility settings:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [isAuthenticated, saveVisibility]);

  // Очищаем флаги при размонтировании
  useEffect(() => {
    return () => {
      isSavingRef.current = false;
    };
  }, []);

  // Auto-persist изменения сразу без дебаунса
  useEffect(() => {
    const unsubscribe = useModelVisibilityStore.subscribe((state, prevState) => {
      if (isAuthenticated && !isSavingRef.current) {
        // Проверяем что действительно изменились нужные нам поля
        const hasChanges = 
          state.favoriteModels !== prevState.favoriteModels ||
          state.enabledProviders !== prevState.enabledProviders ||
          state.selectedModel !== prevState.selectedModel;
        
        if (hasChanges && !state.loading) {
          saveToConvex();
        }
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated, saveToConvex]);

  return { saveToConvex };
} 