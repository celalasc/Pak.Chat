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

/**
 * Describes custom instructions that personalize AI behaviour.
 */
export interface CustomInstructions {
  /** Preferred name used when addressing the user */
  name: string;
  /** Occupation or role of the user */
  occupation: string;
  /** Traits that should influence AI responses */
  traits: string[];
  /** Additional information to remember about the user */
  additionalInfo: string;
}

type Settings = {
  generalFont: GeneralFont;
  codeFont: CodeFont;
  theme: Theme;
  hidePersonal: boolean;
  showNavBars: boolean;
  showChatPreview: boolean;
  customInstructions: CustomInstructions;
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
  hidePersonal: true,
  showNavBars: true,
  showChatPreview: true,
  customInstructions: {
    name: '',
    occupation: '',
    traits: [],
    additionalInfo: '',
  },
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
  const isInitialized = useRef(false);

  // hydrate from server - только один раз при инициализации
  useEffect(() => {
    if (settingsDoc && !isInitialized.current) {
      const { uiFont, codeFont, hidePersonal } = settingsDoc;
      const serverSettings = {
        generalFont: (uiFont as GeneralFont) ?? 'Proxima Vara',
        codeFont: (codeFont as CodeFont) ?? 'Berkeley Mono',
        hidePersonal: hidePersonal ?? false,
      };
      
      setSettings(serverSettings);
      lastSaved.current = {
        ...serverSettings,
        theme: settings.theme,
        showNavBars: settings.showNavBars,
        showChatPreview: settings.showChatPreview,
        customInstructions: settings.customInstructions,
      };
      isInitialized.current = true;
    }
  }, [settingsDoc, setSettings]); // Убираем settings.theme из зависимостей

  // save to server when settings change - только синхронизируемые настройки
  useEffect(() => {
    if (!convexUser || !isInitialized.current) return;
    if (!lastSaved.current) return;
    
    const hasChanges = settings.generalFont !== lastSaved.current.generalFont ||
                      settings.codeFont !== lastSaved.current.codeFont ||
                      settings.hidePersonal !== lastSaved.current.hidePersonal;
    
    if (hasChanges) {
      lastSaved.current = { ...lastSaved.current, ...settings };
      save({
        uiFont: settings.generalFont,
        codeFont: settings.codeFont,
        hidePersonal: settings.hidePersonal,
      } as any);
    }
  }, [settings.generalFont, settings.codeFont, settings.hidePersonal, save, convexUser]); // Только конкретные поля
}