import { threadsCache } from "./threadsCache";
import { useAuthStore } from "@/frontend/stores/AuthStore";

export class PreloadService {
  private static instance: PreloadService;
  private preloadQueue: Set<string> = new Set();
  private isPreloading = false;

  public static getInstance(): PreloadService {
    if (!PreloadService.instance) {
      PreloadService.instance = new PreloadService();
    }
    return PreloadService.instance;
  }

  private constructor() {
    // Инициализируем предзагрузку при создании сервиса
    this.initializePreload();
  }

  private initializePreload(): void {
    // Предзагружаем данные при инициализации приложения
    if (typeof window !== 'undefined') {
      // Предзагружаем данные при загрузке страницы
      this.preloadThreads();
      
      // Предзагружаем данные при фокусе окна
      window.addEventListener('focus', () => {
        this.preloadThreads();
      });

      // Предзагружаем данные при видимости страницы
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.preloadThreads();
        }
      });
    }
  }

  private async preloadThreads(): Promise<void> {
    if (this.isPreloading) return;
    
    this.isPreloading = true;
    
    try {
      const { user } = useAuthStore.getState();
      if (!user?.uid) return;

      const userId = user.uid;
      
      // Проверяем, есть ли уже кэш
      if (threadsCache.hasValidCache(userId)) {
        return;
      }

      // Добавляем в очередь предзагрузки
      if (this.preloadQueue.has(userId)) {
        return;
      }

      this.preloadQueue.add(userId);

      // Импортируем API динамически для уменьшения размера бандла
      const { api } = await import("@/convex/_generated/api");
      const { useQuery } = await import("convex/react");

      // Предзагружаем данные
      await this.fetchThreadsData(userId, api);
      
    } catch (error) {
      console.warn("Failed to preload threads:", error);
    } finally {
      this.isPreloading = false;
      this.preloadQueue.clear();
    }
  }

  private async fetchThreadsData(userId: string, api: any): Promise<void> {
    try {
      // Здесь можно добавить логику для предзагрузки данных
      // Например, через Convex query
      console.log("Preloading threads for user:", userId);
    } catch (error) {
      console.warn("Failed to fetch threads data:", error);
    }
  }

  // Метод для принудительной предзагрузки
  public async forcePreload(): Promise<void> {
    this.isPreloading = false;
    this.preloadQueue.clear();
    await this.preloadThreads();
  }

  // Метод для проверки статуса предзагрузки
  public isPreloadingData(): boolean {
    return this.isPreloading;
  }

  // Метод для очистки кэша
  public clearCache(): void {
    threadsCache.clear();
  }

  // Метод для получения статистики кэша
  public getCacheStats(): { hasCache: boolean; isStale: boolean } {
    const { user } = useAuthStore.getState();
    if (!user?.uid) return { hasCache: false, isStale: true };

    const cached = threadsCache.get(user.uid);
    return {
      hasCache: cached !== null,
      isStale: cached ? cached.isStale : true
    };
  }
}

export const preloadService = PreloadService.getInstance();

// Хук для использования предзагрузки в компонентах
export const usePreloadService = () => {
  return {
    forcePreload: preloadService.forcePreload.bind(preloadService),
    isPreloading: preloadService.isPreloadingData.bind(preloadService),
    clearCache: preloadService.clearCache.bind(preloadService),
    getCacheStats: preloadService.getCacheStats.bind(preloadService),
  };
};