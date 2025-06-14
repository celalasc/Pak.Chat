import { create } from 'zustand';
import { useEffect, useCallback } from 'react';
import { useMutation, useQuery, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { encryptData, decryptData } from '@/frontend/lib/crypto';
import { useAuthStore } from './AuthStore';

export const PROVIDERS = ['google', 'openrouter', 'openai'] as const;
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

const store = create<APIKeyState>(() => ({
  keys: { google: '', openrouter: '', openai: '' },
  keysLoading: true,
  setLocal: () => {},
  getKey: (provider: Provider) => store.getState().keys[provider],
  hasRequiredKeys: () => !!store.getState().keys.google,
}));

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
  
  // Получаем состояние из store
  const storeState = store();
  const keysLoading = convexUser === undefined;

  // Возвращаем keys и утилиты из состояния
  const { keys, getKey, hasRequiredKeys } = storeState;
  
  const setLocal = (updates: Partial<APIKeys>) => {
    const currentKeys = store.getState().keys;
    const newKeys = { ...currentKeys, ...updates };
    
    // Защита от пустых вызовов - проверяем, действительно ли изменились ключи
    if (!deepEqual(currentKeys, newKeys)) {
      store.setState({ keys: newKeys });
    }
  };

  useEffect(() => {
    if (settings && user) {
      const decrypted = decryptData<APIKeys>(settings.encryptedApiKeys, user.uid);
      const currentKeys = store.getState().keys;
      
      // Защита от пустых вызовов - обновляем только если ключи действительно изменились
      if (!deepEqual(currentKeys, decrypted)) {
        store.setState({ keys: decrypted, keysLoading: false });
      } else if (store.getState().keysLoading) {
        store.setState({ keysLoading: false });
      }
    } else if (settings === null) {
      store.setState({ keysLoading: false });
    }
  }, [settings, user]);

  const setKeys = async (updates: Partial<APIKeys>) => {
    const currentKeys = store.getState().keys;
    const newKeys = { ...currentKeys, ...updates };
    
    console.log('setKeys called with updates:', updates);
    console.log('Current keys:', currentKeys);
    console.log('New keys:', newKeys);
    
    // Защита от пустых вызовов - проверяем, действительно ли изменились ключи
    if (!deepEqual(currentKeys, newKeys)) {
      console.log('Keys changed, updating store');
      store.setState({ keys: newKeys });
      
      if (user) {
        console.log('User exists, encrypting and saving to Convex');
        const encrypted = encryptData(newKeys, user.uid);
        try {
          await saveApiKeys({ encryptedApiKeys: encrypted });
          console.log('Keys saved successfully to Convex');
        } catch (error) {
          console.error('Failed to save API keys', error);
          const { toast } = await import('sonner');
          toast.error('Failed to save keys');
        }
      } else {
        console.log('No user, keys saved only locally');
      }
    } else {
      console.log('Keys unchanged, skipping update');
    }
  };

  return { keys, setKeys, hasRequiredKeys, getKey, setLocal, keysLoading };
}
