import { Doc } from "@/convex/_generated/dataModel";

export interface ThreadsCacheEntry {
  threads: Doc<"threads">[];
  timestamp: number;
  isStale: boolean;
}

export class ThreadsCache {
  private static instance: ThreadsCache;
  private memoryCache = new Map<string, ThreadsCacheEntry>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 минут
  private readonly STORAGE_KEY = "pak_chat_threads_cache";

  public static getInstance(): ThreadsCache {
    if (!ThreadsCache.instance) {
      ThreadsCache.instance = new ThreadsCache();
    }
    return ThreadsCache.instance;
  }

  private constructor() {
    // Восстанавливаем кэш из localStorage при инициализации
    this.restoreFromStorage();
  }

  private restoreFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsedData: Record<string, ThreadsCacheEntry> = JSON.parse(stored);
        const now = Date.now();
        
        // Проверяем актуальность данных
        Object.entries(parsedData).forEach(([key, entry]) => {
          if (now - entry.timestamp < this.CACHE_DURATION) {
            this.memoryCache.set(key, entry);
          }
        });
      }
    } catch (error) {
      console.warn("Failed to restore threads cache from localStorage:", error);
    }
  }

  private saveToStorage(): void {
    try {
      const cacheData: Record<string, ThreadsCacheEntry> = {};
      this.memoryCache.forEach((entry, key) => {
        cacheData[key] = entry;
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Failed to save threads cache to localStorage:", error);
    }
  }

  public get(userId: string): ThreadsCacheEntry | null {
    const cached = this.memoryCache.get(userId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      cached.isStale = true;
    }

    return cached;
  }

  public set(userId: string, threads: Doc<"threads">[]): void {
    const now = Date.now();
    const entry: ThreadsCacheEntry = {
      threads,
      timestamp: now,
      isStale: false
    };

    this.memoryCache.set(userId, entry);
    this.saveToStorage();

    // Автоматически помечаем как устаревший через определенное время
    setTimeout(() => {
      const cached = this.memoryCache.get(userId);
      if (cached && cached.timestamp === now) {
        cached.isStale = true;
        this.saveToStorage();
      }
    }, this.CACHE_DURATION);
  }

  public invalidate(userId: string): void {
    this.memoryCache.delete(userId);
    this.saveToStorage();
  }

  public clear(): void {
    this.memoryCache.clear();
    localStorage.removeItem(this.STORAGE_KEY);
  }

  public has(userId: string): boolean {
    return this.memoryCache.has(userId);
  }

  public isStale(userId: string): boolean {
    const cached = this.memoryCache.get(userId);
    return cached ? cached.isStale : true;
  }

  // Prefetch для подготовки данных заранее
  public prefetch(userId: string): ThreadsCacheEntry | null {
    const cached = this.get(userId);
    if (cached && !cached.isStale) {
      return cached;
    }
    return null;
  }
}

export const threadsCache = ThreadsCache.getInstance();
