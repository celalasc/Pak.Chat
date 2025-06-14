import { create } from 'zustand';
import { useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { encryptData, decryptData } from '@/frontend/lib/crypto';
import { useAuthStore } from './AuthStore';

export const PROVIDERS = ['google', 'openrouter', 'openai'] as const;
export type Provider = (typeof PROVIDERS)[number];
export type APIKeys = Record<Provider, string>;

type APIKeyState = {
  keys: APIKeys;
  setLocal: (keys: Partial<APIKeys>) => void;
};

const store = create<APIKeyState>(() => ({
  keys: { google: '', openrouter: '', openai: '' },
  setLocal: () => {},
}));

export function useAPIKeyStore() {
  const { user } = useAuthStore();
  const settings = useQuery(api.userSettings.get);
  const saveApiKeys = useMutation(api.userSettings.saveApiKeys);
  const { keys } = store();
  const setLocal = (updates: Partial<APIKeys>) =>
    store.setState(state => ({ keys: { ...state.keys, ...updates } }));

  useEffect(() => {
    if (settings && user) {
      const decrypted = decryptData<APIKeys>(settings.encryptedApiKeys, user.uid);
      store.setState({ keys: decrypted });
    }
  }, [settings, user]);

  const setKeys = async (updates: Partial<APIKeys>) => {
    const newKeys = { ...store.getState().keys, ...updates };
    store.setState({ keys: newKeys });
    if (user) {
      const encrypted = encryptData(newKeys, user.uid);
      await saveApiKeys({ encryptedApiKeys: encrypted });
    }
  };

  const hasRequiredKeys = () => !!store.getState().keys.google;
  const getKey = (provider: Provider) => store.getState().keys[provider] || null;

  return { keys, setKeys, hasRequiredKeys, getKey, setLocal };
}
