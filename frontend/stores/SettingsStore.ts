import { create, Mutate, StoreApi } from 'zustand';
import { persist } from 'zustand/middleware';

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