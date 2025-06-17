import { create, Mutate, StoreApi } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIModel, getModelConfig, ModelConfig } from '@/lib/models';

type ModelStore = {
  selectedModel: AIModel;
  favoriteModels: AIModel[];
  setModel: (model: AIModel) => void;
  toggleFavorite: (model: AIModel) => void;
  isFavorite: (model: AIModel) => boolean;
  getModelConfig: () => ModelConfig;
};

type StoreWithPersist = Mutate<
  StoreApi<ModelStore>,
  [['zustand/persist', { selectedModel: AIModel; favoriteModels: AIModel[] }]]
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
      favoriteModels: ['Gemini 2.5 Flash', 'GPT-4o', 'Deepseek R1 0528'],

      setModel: (model) => {
        set({ selectedModel: model });
      },

      toggleFavorite: (model) => {
        set((state) => {
          const isFav = state.favoriteModels.includes(model);
          if (isFav) {
            return {
              favoriteModels: state.favoriteModels.filter(m => m !== model)
            };
          } else {
            return {
              favoriteModels: [...state.favoriteModels, model]
            };
          }
        });
      },

      isFavorite: (model) => {
        return get().favoriteModels.includes(model);
      },

      getModelConfig: () => {
        const { selectedModel } = get();
        return getModelConfig(selectedModel);
      },
    }),
    {
      name: 'selected-model',
      partialize: (state) => ({ 
        selectedModel: state.selectedModel,
        favoriteModels: state.favoriteModels
      }),
    }
  )
);

withStorageDOMEvents(useModelStore);
