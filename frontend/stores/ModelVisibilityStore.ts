import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIModel, getModelsByProvider, getModelConfig } from '@/lib/models';
import { Provider } from '@/frontend/stores/APIKeyStore';

type ModelVisibilityStore = {
  // Избранные модели
  favoriteModels: AIModel[];
  // Включенные провайдеры
  enabledProviders: Provider[];
  // Загрузка
  loading: boolean;
  
  // Действия
  toggleFavoriteModel: (model: AIModel) => void;
  toggleProvider: (provider: Provider) => void;
  isProviderEnabled: (provider: Provider) => boolean;
  isFavoriteModel: (model: AIModel) => boolean;
  
  // Получение видимых моделей с учетом провайдеров
  getVisibleFavoriteModels: () => AIModel[];
  getVisibleGeneralModels: () => AIModel[];
  
  // Синхронизация с Convex
  syncWithConvex: (data: { favoriteModels: string[], enabledProviders: string[] }) => void;
  setLoading: (loading: boolean) => void;
};

export const useModelVisibilityStore = create<ModelVisibilityStore>()(
  persist(
    (set, get) => ({
      favoriteModels: [],
      enabledProviders: ['google', 'openrouter', 'openai', 'groq'],
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

      isProviderEnabled: (provider: Provider) => {
        return get().enabledProviders.includes(provider);
      },

      isFavoriteModel: (model: AIModel) => {
        return get().favoriteModels.includes(model);
      },

      getVisibleFavoriteModels: () => {
        const { favoriteModels, enabledProviders } = get();
        // Фильтруем избранные модели только от включенных провайдеров
        return favoriteModels.filter(model => {
          const config = getModelConfig(model);
          return enabledProviders.includes(config.provider as Provider);
        });
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

      syncWithConvex: (data: { favoriteModels: string[], enabledProviders: string[] }) => {
        set({
          favoriteModels: data.favoriteModels as AIModel[],
          enabledProviders: data.enabledProviders as Provider[],
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
      }),
    }
  )
); 