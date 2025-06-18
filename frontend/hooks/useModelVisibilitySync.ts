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

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  // Save changes to Convex with debouncing and duplicate prevention
  const saveToConvex = useCallback(() => {
    if (!isAuthenticated || isSavingRef.current) return;

    // Очищаем предыдущий таймер
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Устанавливаем новый таймер
    saveTimeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;

      const { favoriteModels, enabledProviders } = store.getState(); // Актуальные данные

      isSavingRef.current = true;
      try {
        await saveVisibility({
          favoriteModels,
          enabledProviders,
        });
      } catch (error) {
        console.error('Failed to save model visibility settings:', error);
      } finally {
        isSavingRef.current = false;
      }
    }, 150);
  }, [isAuthenticated, saveVisibility]);

  // Очищаем таймер при размонтировании
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return { saveToConvex };
} 