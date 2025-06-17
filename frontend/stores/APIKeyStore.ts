import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useCallback } from 'react';
import { useMutation, useQuery, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { encryptData, decryptData } from '@/frontend/lib/crypto';
import { useAuthStore } from './AuthStore';
import { withStorageDOMEvents } from './ModelStore';

export const PROVIDERS = ['google', 'openrouter', 'openai', 'groq'] as const;
export type Provider = (typeof PROVIDERS)[number];
export type APIKeys = Record<Provider, string>;

type APIKeyState = {
  keys: APIKeys;
  keysLoading: boolean;
  setLocal: (keys: Partial<APIKeys>) => void;
  /** Возвращает ключ по имени провайдера */
  getKey: (provider: Provider) => string | undefined;
  /** Проверяет наличие обязательных ключей */
  hasRequiredKeys: () => boolean;
};

// Функция для глубокого сравнения объектов
const deepEqual = (a: APIKeys, b: APIKeys): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

// Zustand store for managing API keys with persistence
const baseStore = create<APIKeyState>()(
  persist(
    (set, get) => ({
      keys: { google: '', openrouter: '', openai: '', groq: '' },
      keysLoading: true,
      setLocal: (updates) =>
        set((state) => ({ keys: { ...state.keys, ...updates } })),
      getKey: (provider: Provider) => get().keys[provider],
      hasRequiredKeys: () => !!get().keys.google,
    }),
    {
      name: 'pak-chat-api-keys',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

(withStorageDOMEvents as any)(baseStore as any);

export function useAPIKeyStore() {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useAuthStore();

  // Fetch the Convex user to ensure sync is complete
  const convexUser = useQuery(
    api.users.getCurrent,
    isAuthenticated ? {} : 'skip'
  );

  // Only query settings once the user exists in Convex
  const settings = useQuery(
    api.userSettings.get,
    convexUser ? {} : 'skip'
  );
  const saveApiKeys = useMutation(api.userSettings.saveApiKeys);
  
  // Получаем состояние из baseStore
  const storeState = baseStore();
  // Loading is finished only after both user and settings are fetched
  const keysLoading = convexUser === undefined || settings === undefined;

  // Возвращаем keys и утилиты из состояния
  const { keys, getKey, hasRequiredKeys } = storeState;
  
  const setLocal = (updates: Partial<APIKeys>) => {
    const currentKeys = baseStore.getState().keys;
    const newKeys = { ...currentKeys, ...updates };
    
    // Защита от пустых вызовов - проверяем, действительно ли изменились ключи
    if (!deepEqual(currentKeys, newKeys)) {
      baseStore.setState({ keys: newKeys });
    }
  };

  useEffect(() => {
    if (settings && user) {
      const decrypted = decryptData<APIKeys>(settings.encryptedApiKeys, user.uid);
      const currentKeys = baseStore.getState().keys;

      // Update keys only when they differ to avoid unnecessary renders
      if (!deepEqual(currentKeys, decrypted)) {
        baseStore.setState({ keys: decrypted });
      }
      // Mark loading complete once keys have been processed
      if (baseStore.getState().keysLoading) {
        baseStore.setState({ keysLoading: false });
      }
    } else if (settings === null && baseStore.getState().keysLoading) {
      // No settings stored for this user
      baseStore.setState({ keysLoading: false });
    }
  }, [settings, user]);

  const setKeys = async (updates: Partial<APIKeys>) => {
    const currentKeys = baseStore.getState().keys;
    const newKeys = { ...currentKeys, ...updates };
    
    
    // Защита от пустых вызовов - проверяем, действительно ли изменились ключи
    if (!deepEqual(currentKeys, newKeys)) {
      baseStore.setState({ keys: newKeys });
      
      if (user) {
        const encrypted = encryptData(newKeys, user.uid);
        try {
          await saveApiKeys({ encryptedApiKeys: encrypted });
        } catch (error) {
          const { toast } = await import('sonner');
          toast.error('Failed to save keys');
        }
      } else {
      }
    } else {
    }
  };

  return { keys, setKeys, hasRequiredKeys, getKey, setLocal, keysLoading };
}
