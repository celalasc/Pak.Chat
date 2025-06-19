import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIModel, getModelsByProvider } from '@/lib/models';
import { Provider } from '@/frontend/stores/APIKeyStore';

type ModelVisibilityStore = {
  // Избранные модели
  favoriteModels: AIModel[];
  // Включенные провайдеры
  enabledProviders: Provider[];
  // Выбранная модель
  selectedModel: AIModel;
  // Загрузка
  loading: boolean;
  
  // Действия
  toggleFavoriteModel: (model: AIModel) => void;
  toggleProvider: (provider: Provider) => void;
  setSelectedModel: (model: AIModel) => void;
  isProviderEnabled: (provider: Provider) => boolean;
  isFavoriteModel: (model: AIModel) => boolean;
  
  // Получение видимых моделей с учетом провайдеров
  getVisibleFavoriteModels: () => AIModel[];
  getVisibleGeneralModels: () => AIModel[];
  
  // Синхронизация с Convex
  syncWithConvex: (data: { favoriteModels: string[], enabledProviders: string[], selectedModel?: string }) => void;
  setLoading: (loading: boolean) => void;
};

export const useModelVisibilityStore = create<ModelVisibilityStore>()(
  persist(
    (set, get) => ({
      favoriteModels: [],
      enabledProviders: ['google', 'openrouter', 'openai', 'groq'],
      selectedModel: 'Gemini 2.5 Flash',
      loading: false,

      toggleFavoriteModel: (model: AIModel) => {
        const { favoriteModels } = get();
        const newFavorites = favoriteModels.includes(model)
          ? favoriteModels.filter(m => m !== model)
          : [...favoriteModels, model];
        
        set({ favoriteModels: newFavorites });
      },

      toggleProvider: (provider: Provider) => {
        const { enabledProviders } = get();
        const newProviders = enabledProviders.includes(provider)
          ? enabledProviders.filter(p => p !== provider)
          : [...enabledProviders, provider];
        
        set({ enabledProviders: newProviders });
      },

      setSelectedModel: (model: AIModel) => {
        set({ selectedModel: model });
      },

      isProviderEnabled: (provider: Provider) => {
        return get().enabledProviders.includes(provider);
      },

      isFavoriteModel: (model: AIModel) => {
        return get().favoriteModels.includes(model);
      },

      getVisibleFavoriteModels: () => {
        return get().favoriteModels;
      },

      getVisibleGeneralModels: () => {
        const { enabledProviders } = get();
        const modelsByProvider = getModelsByProvider();
        const allModels: AIModel[] = [];
        
        for (const [provider, models] of Object.entries(modelsByProvider)) {
          if (enabledProviders.includes(provider as Provider)) {
            allModels.push(...models);
          }
        }
        
        return allModels;
      },

      syncWithConvex: (data: { favoriteModels: string[], enabledProviders: string[], selectedModel?: string }) => {
        set({
          favoriteModels: data.favoriteModels as AIModel[],
          enabledProviders: data.enabledProviders as Provider[],
          selectedModel: (data.selectedModel as AIModel) || 'Gemini 2.5 Flash',
          loading: false,
        });
      },

      setLoading: (loading: boolean) => {
        set({ loading });
      },
    }),
    {
      name: 'model-visibility',
      partialize: (state) => ({
        favoriteModels: state.favoriteModels,
        enabledProviders: state.enabledProviders,
        selectedModel: state.selectedModel,
      }),
    }
  )
); 