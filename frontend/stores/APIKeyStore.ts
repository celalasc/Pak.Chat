import { create } from 'zustand';
import { useEffect } from 'react';
import { useMutation, useQuery, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuthStore } from './AuthStore';

export const PROVIDERS = ['google', 'openrouter', 'openai', 'groq'] as const;
export type Provider = (typeof PROVIDERS)[number];
export type APIKeys = Record<Provider, string>;

type APIKeyState = {
  keys: APIKeys;
  keysLoading: boolean;
  /** Возвращает ключ по имени провайдера */
  getKey: (provider: Provider) => string | undefined;
  /** Проверяет наличие обязательных ключей */
  hasRequiredKeys: () => boolean;
  setKeys: (keys: Partial<APIKeys>) => Promise<void>;
};

// Функция для глубокого сравнения объектов
const deepEqual = (a: APIKeys, b: APIKeys): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

// Zustand store for managing API keys
const baseStore = create<APIKeyState>((set, get) => ({
  keys: { google: '', openrouter: '', openai: '', groq: '' },
  keysLoading: true,
  getKey: (provider: Provider) => get().keys[provider],
  hasRequiredKeys: () => !!get().keys.google,
  setKeys: async () => {}, // Будет переопределено в хуке
}));

export function useAPIKeyStore() {
  const { isAuthenticated } = useConvexAuth();

  // Fetch API keys from Convex
  const apiKeysData = useQuery(
    api.apiKeys.getApiKeys,
    isAuthenticated ? {} : 'skip'
  );
  const saveApiKeys = useMutation(api.apiKeys.setApiKeys);
  
  // Получаем состояние из baseStore
  const storeState = baseStore();
  
  // Reflect loading status stored in baseStore, which becomes false after the first successful/failed fetch
  const { keysLoading } = storeState;

  // Возвращаем keys и утилиты из состояния
  const { keys, getKey, hasRequiredKeys } = storeState;

  useEffect(() => {
    if (apiKeysData) {
      const currentKeys = baseStore.getState().keys;

      // Update keys only when they differ to avoid unnecessary renders
      if (!deepEqual(currentKeys, apiKeysData)) {
        baseStore.setState({ keys: apiKeysData });
      }
      // Mark loading complete once keys have been processed
      if (baseStore.getState().keysLoading) {
        baseStore.setState({ keysLoading: false });
      }
    } else if (apiKeysData === null && baseStore.getState().keysLoading) {
      // No API keys stored for this user
      baseStore.setState({ keysLoading: false });
    }
  }, [apiKeysData]);

  const setKeys = async (updates: Partial<APIKeys>) => {
    const currentKeys = baseStore.getState().keys;
    const newKeys = { ...currentKeys, ...updates };
    
    // Защита от пустых вызовов - проверяем, действительно ли изменились ключи
    if (!deepEqual(currentKeys, newKeys)) {
      baseStore.setState({ keys: newKeys });
      
      try {
        await saveApiKeys({
          google: newKeys.google || undefined,
          openrouter: newKeys.openrouter || undefined,
          openai: newKeys.openai || undefined,
          groq: newKeys.groq || undefined,
        });
      } catch (error) {
        const { toast } = await import('sonner');
        toast.error('Failed to save keys');
        // Откатываем изменения при ошибке
        baseStore.setState({ keys: currentKeys });
      }
    }
  };

  return { keys, setKeys, hasRequiredKeys, getKey, keysLoading };
}
