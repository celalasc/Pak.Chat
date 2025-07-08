import { create, Mutate, StoreApi } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIModel, getModelConfig, ModelConfig } from '@/lib/models';

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
