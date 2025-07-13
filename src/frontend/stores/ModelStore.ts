import { create, Mutate, StoreApi } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIModel, getModelConfig, ModelConfig } from '@/lib/models';
import { useEffect, useRef } from 'react';
import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useCustomModesStore } from './CustomModesStore';

export type ReasoningEffort = "medium" | "low" | "high";

type ModelStore = {
  selectedModel: AIModel;
  modelSpecificSettings: Partial<Record<AIModel, { reasoningEffort?: ReasoningEffort }>>;
  webSearchEnabled: boolean;
  setModel: (model: AIModel) => void;
  getModelConfig: () => ModelConfig;
  setReasoningEffort: (model: AIModel, effort: ReasoningEffort) => void;
  setWebSearchEnabled: (enabled: boolean) => void;
  supportsWebSearch: (model?: AIModel) => boolean;
  // Новые методы для синхронизации
  syncSelectedModel: (model: AIModel) => void;
};

type StoreWithPersist = Mutate<
  StoreApi<ModelStore>,
  [['zustand/persist', { selectedModel: AIModel; modelSpecificSettings: Partial<Record<AIModel, { reasoningEffort?: ReasoningEffort }>>; webSearchEnabled: boolean }]]
>;

export const withStorageDOMEvents = (store: StoreWithPersist) => {
  const storageEventCallback = (e: StorageEvent) => {
    if (e.key === store.persist.getOptions().name && e.newValue) {
      store.persist.rehydrate();
    }
  };

  // Проверяем что window существует (только на клиенте)
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', storageEventCallback);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', storageEventCallback);
    }
  };
};

export const useModelStore = create<ModelStore>()(
  persist(
    (set, get) => ({
      selectedModel: 'Gemini 2.5 Flash',
      modelSpecificSettings: {},
      webSearchEnabled: false,

      setModel: (model) => {
        set({ selectedModel: model });
        // Синхронизация будет происходить через useModelSync хук
      },

      syncSelectedModel: (model) => {
        // Синхронизация модели из Convex без повторного сохранения
        set({ selectedModel: model });
      },

      getModelConfig: () => {
        const { selectedModel, modelSpecificSettings } = get();
        const baseConfig = getModelConfig(selectedModel);
        return {
          ...baseConfig,
          reasoningEffort: modelSpecificSettings[selectedModel]?.reasoningEffort || baseConfig.reasoningEffort,
        };
      },

      setReasoningEffort: (model, effort) => {
        set(state => ({
          modelSpecificSettings: {
            ...state.modelSpecificSettings,
            [model]: {
              ...state.modelSpecificSettings[model],
              reasoningEffort: effort,
            },
          },
        }));
      },

      setWebSearchEnabled: (enabled) => {
        set({ webSearchEnabled: enabled });
      },

      supportsWebSearch: (model) => {
        const targetModel = model || get().selectedModel;
        const config = getModelConfig(targetModel);
        // Веб-поиск поддерживают модели Google (Gemini)
        return config.provider === 'google';
      },
    }),
    {
      name: 'selected-model',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        modelSpecificSettings: state.modelSpecificSettings,
        webSearchEnabled: state.webSearchEnabled,
      }),
    }
  )
);

withStorageDOMEvents(useModelStore);

// Sync model settings with Convex
export function useModelSync() {
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

  const { selectedModel, webSearchEnabled, syncSelectedModel, setWebSearchEnabled } = useModelStore();
  const lastSaved = useRef<{ selectedModel: AIModel; webSearchEnabled: boolean } | null>(null);
  const isInitialized = useRef(false);

  // Load from server once
  useEffect(() => {
    if (settingsDoc && !isInitialized.current) {
      const serverSelectedModel = (settingsDoc.selectedModel as AIModel) ?? 'Gemini 2.5 Flash';
      const serverWebSearchEnabled = settingsDoc.webSearchEnabled ?? false;
      
      syncSelectedModel(serverSelectedModel);
      setWebSearchEnabled(serverWebSearchEnabled);
      
      lastSaved.current = {
        selectedModel: serverSelectedModel,
        webSearchEnabled: serverWebSearchEnabled,
      };
      isInitialized.current = true;
    }
  }, [settingsDoc, syncSelectedModel, setWebSearchEnabled]);

  // Save to server when settings change
  useEffect(() => {
    if (!convexUser || !isInitialized.current || !lastSaved.current) return;
    
    const hasChanges = selectedModel !== lastSaved.current.selectedModel ||
                      webSearchEnabled !== lastSaved.current.webSearchEnabled;
    
    if (hasChanges) {
      lastSaved.current = { selectedModel, webSearchEnabled };
      
      // We need all settings to call the save function
      if (settingsDoc) {
        // Get current custom modes settings from their store to avoid overwriting
        const customModesStore = useCustomModesStore.getState();
        
        save({
          uiFont: settingsDoc.uiFont || 'Proxima Vara',
          codeFont: settingsDoc.codeFont || 'Berkeley Mono',
          hidePersonal: settingsDoc.hidePersonal || false,
          showNavBars: settingsDoc.showNavBars ?? true,
          showChatPreview: settingsDoc.showChatPreview ?? true,
          isCustomModesEnabled: customModesStore.isCustomModesEnabled,
          selectedMode: customModesStore.selectedMode,
          webSearchEnabled: webSearchEnabled,
          selectedModel: selectedModel,
        } as any);
      }
    }
  }, [selectedModel, webSearchEnabled, save, convexUser, settingsDoc]);

  return {};
}
