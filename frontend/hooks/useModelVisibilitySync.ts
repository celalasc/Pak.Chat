import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useModelVisibilityStore } from '@/frontend/stores/ModelVisibilityStore';

export function useModelVisibilitySync() {
  const { isAuthenticated } = useConvexAuth();
  const {
    syncWithConvex,
    setLoading,
    favoriteModels,
    enabledProviders,
  } = useModelVisibilityStore();

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Save changes to Convex with debouncing
  const saveToConvex = async () => {
    if (!isAuthenticated) return;
    
    // Очищаем предыдущий таймер
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Устанавливаем новый таймер
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveVisibility({
          favoriteModels,
          enabledProviders,
        });
      } catch (error) {
        console.error('Failed to save model visibility settings:', error);
      }
    }, 300); // 300ms дебаунс
  };

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