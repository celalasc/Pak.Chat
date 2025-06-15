import { create, Mutate, StoreApi } from 'zustand';
import { persist } from 'zustand/middleware';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect, useRef } from 'react';

export const GENERAL_FONTS = ['Proxima Vara', 'System Font'] as const;
export const CODE_FONTS = ['Berkeley Mono', 'System Monospace Font'] as const;
export const THEMES = ['light', 'dark'] as const;

export type GeneralFont = (typeof GENERAL_FONTS)[number];
export type CodeFont = (typeof CODE_FONTS)[number];
export type Theme = (typeof THEMES)[number];

type Settings = {
  generalFont: GeneralFont;
  codeFont: CodeFont;
  theme: Theme;
  hidePersonal: boolean;
};

type SettingsStore = {
  settings: Settings;
  setSettings: (newSettings: Partial<Settings>) => void;
  resetSettings: () => void;
};

type StoreWithPersist = Mutate<
  StoreApi<SettingsStore>,
  [['zustand/persist', { settings: Settings }]]
>;

export const withStorageDOMEvents = (store: StoreWithPersist) => {
  const storageEventCallback = (e: StorageEvent) => {
    if (e.key === store.persist.getOptions().name && e.newValue) {
      store.persist.rehydrate();
    }
  };

  window.addEventListener('storage', storageEventCallback);

  return () => {
    window.removeEventListener('storage', storageEventCallback);
  };
};

const defaultSettings: Settings = {
  // Default interface font uses Proxima Vara when available
  generalFont: 'Proxima Vara',
  // Code font remains Berkeley Mono by default
  codeFont: 'Berkeley Mono',
  theme: 'light',
  hidePersonal: false,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,

      setSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      resetSettings: () => {
        set({ settings: defaultSettings });
      },
    }),
    {
      name: 'user-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);

if (typeof window !== 'undefined') {
  withStorageDOMEvents(useSettingsStore);
}

export function useSettingsSync() {
  const { isAuthenticated } = useConvexAuth();
  const convexUser = useQuery(
    api.users.getCurrent,
    isAuthenticated ? {} : 'skip'
  );
  const settingsDoc = useQuery(
    api.userSettings.get,
    convexUser ? {} : 'skip'
  );
  const save = useMutation(api.userSettings.saveSettings);

  const { settings, setSettings } = useSettingsStore();
  const lastSaved = useRef<typeof settings | null>(null);

  // hydrate from server
  useEffect(() => {
    if (settingsDoc) {
      const { uiFont, codeFont, hidePersonal } = settingsDoc;
      setSettings({
        generalFont: uiFont as GeneralFont ?? 'Proxima Vara',
        codeFont: codeFont as CodeFont ?? 'Berkeley Mono',
        hidePersonal: hidePersonal ?? false,
      });
      lastSaved.current = {
        generalFont: uiFont as GeneralFont ?? 'Proxima Vara',
        codeFont: codeFont as CodeFont ?? 'Berkeley Mono',
        theme: settings.theme,
        hidePersonal: hidePersonal ?? false,
      };
    }
  }, [settingsDoc, setSettings, settings.theme]);

  // save to server when settings change
  useEffect(() => {
    if (!convexUser) return;
    if (!lastSaved.current) return;
    if (
      settings.generalFont !== lastSaved.current.generalFont ||
      settings.codeFont !== lastSaved.current.codeFont ||
      settings.hidePersonal !== lastSaved.current.hidePersonal
    ) {
      lastSaved.current = settings;
      save({
        uiFont: settings.generalFont,
        codeFont: settings.codeFont,
        hidePersonal: settings.hidePersonal,
      });
    }
  }, [settings, save, convexUser]);
}