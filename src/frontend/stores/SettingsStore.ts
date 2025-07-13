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

export type CustomInstructions = {
  name: string; // What should AI call you? (max 50)
  occupation: string; // What do you do? (max 100)
  traits: string[]; // What traits should AI have? - готовые плитки (max 50 chars each)
  traitsText: string; // What traits should AI have? - свободный текст (max 500)
  additionalInfo: string; // Anything else AI should know? (max 3000)
};

type Settings = {
  generalFont: GeneralFont;
  codeFont: CodeFont;
  theme: Theme;
  hidePersonal: boolean;
  showNavBars: boolean;
  showChatPreview: boolean;
  customInstructions?: CustomInstructions;
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

const defaultCustomInstructions: CustomInstructions = {
  name: '',
  occupation: '',
  traits: [],
  traitsText: '',
  additionalInfo: '',
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
  customInstructions: defaultCustomInstructions,
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
  const saveCustomInstructions = useMutation(api.userSettings.saveCustomInstructions);

  const { settings, setSettings } = useSettingsStore();
  const lastSaved = useRef<typeof settings | null>(null);
  const isInitialized = useRef(false);

  // hydrate from server - только один раз при инициализации
  useEffect(() => {
    if (settingsDoc && !isInitialized.current) {
      const { 
        uiFont, 
        codeFont, 
        hidePersonal,
        showNavBars,
        showChatPreview,
        customInstructionsName,
        customInstructionsOccupation,
        customInstructionsTraits,
        customInstructionsTraitsText,
        customInstructionsAdditionalInfo
      } = settingsDoc;
      
      const customInstructions = {
        name: customInstructionsName ?? '',
        occupation: customInstructionsOccupation ?? '',
        traits: customInstructionsTraits ?? [],
        traitsText: customInstructionsTraitsText ?? '',
        additionalInfo: customInstructionsAdditionalInfo ?? '',
      };
      
      const serverSettings = {
        generalFont: (uiFont as GeneralFont) ?? 'Proxima Vara',
        codeFont: (codeFont as CodeFont) ?? 'Berkeley Mono',
        hidePersonal: hidePersonal ?? false,
        showNavBars: showNavBars ?? true,
        showChatPreview: showChatPreview ?? true,
        customInstructions,
      };
      
      setSettings(serverSettings);
      lastSaved.current = {
        ...serverSettings,
        theme: settings.theme,
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
                      settings.hidePersonal !== lastSaved.current.hidePersonal ||
                      settings.showNavBars !== lastSaved.current.showNavBars ||
                      settings.showChatPreview !== lastSaved.current.showChatPreview;
    
    if (hasChanges) {
      lastSaved.current = { ...lastSaved.current, ...settings };
      save({
        uiFont: settings.generalFont,
        codeFont: settings.codeFont,
        hidePersonal: settings.hidePersonal,
        showNavBars: settings.showNavBars,
        showChatPreview: settings.showChatPreview,
      } as any);
    }
  }, [settings.generalFont, settings.codeFont, settings.hidePersonal, settings.showNavBars, settings.showChatPreview, save, convexUser]); // Только конкретные поля

  // Функция для ручного сохранения кастомных инструкций
  const saveCustomInstructionsManually = async () => {
    if (!isAuthenticated) {
      return false;
    }
    
    const currentInstructions = settings.customInstructions || defaultCustomInstructions;
    
    try {
      await saveCustomInstructions({
        customInstructionsName: currentInstructions.name || undefined,
        customInstructionsOccupation: currentInstructions.occupation || undefined,
        customInstructionsTraits: currentInstructions.traits.length > 0 ? currentInstructions.traits : undefined,
        customInstructionsTraitsText: currentInstructions.traitsText || undefined,
        customInstructionsAdditionalInfo: currentInstructions.additionalInfo || undefined,
      });
      
      // Обновляем lastSaved после успешного сохранения
      if (lastSaved.current) {
        lastSaved.current = { ...lastSaved.current, customInstructions: currentInstructions };
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save custom instructions:', error);
      throw error; // Пробрасываем ошибку наверх для более детальной обработки
    }
  };

  return { saveCustomInstructionsManually };
}

// Separate hook for syncing feature settings with external stores
export function useFeatureSettingsSync() {
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

  // Import stores that need syncing
  const { settings } = useSettingsStore();
  
  // We'll need to access external stores here
  const syncFeatureSettings = async (
    customModesEnabled: boolean,
    selectedMode: string,
    webSearchEnabled: boolean,
    selectedModel: string
  ) => {
    if (!isAuthenticated) return;
    
    try {
      await save({
        uiFont: settings.generalFont,
        codeFont: settings.codeFont,
        hidePersonal: settings.hidePersonal,
        showNavBars: settings.showNavBars,
        showChatPreview: settings.showChatPreview,
        isCustomModesEnabled: customModesEnabled,
        selectedMode: selectedMode,
        webSearchEnabled: webSearchEnabled,
        selectedModel: selectedModel,
      } as any);
    } catch (error) {
      console.error('Failed to sync feature settings:', error);
    }
  };

  return { syncFeatureSettings, settingsDoc };
}