import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/frontend/stores/AuthStore";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { useEffect, useState, useCallback } from "react";
import { threadsCache } from "@/frontend/lib/threadsCache";

// Extended thread type with project information
type ThreadWithProject = Doc<"threads"> & {
  projectId?: Id<"projects">;
};

export function useConvexThreads() {
  const { user } = useAuthStore();
  const [cachedThreads, setCachedThreads] = useState<ThreadWithProject[]>([]);
  const [hasInitialData, setHasInitialData] = useState(false);
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(false);
  // Firebase User object uses `uid` as the identifier
  const userId = user?.uid || 'anonymous';
  
  // Получение тредов пользователя с информацией о проектах
  const threads = useQuery(
    api.threads.listWithProjects,
    user ? {} : "skip"
  );

  // Быстрая загрузка из кэша при инициализации
  useEffect(() => {
    if (!user) return;
    
    setIsLoadingFromCache(true);
    const cached = threadsCache.get(userId);
    if (cached && !cached.isStale) {
      setCachedThreads(cached.threads);
      setHasInitialData(true);
    }
    setIsLoadingFromCache(false);
  }, [user, userId]);

  // Обновляем кэш когда приходят новые данные
  useEffect(() => {
    if (threads && user) {
      threadsCache.set(userId, threads);
      setCachedThreads(threads);
      setHasInitialData(true);
    }
  }, [threads, user, userId]);

  // Мутации
  const createThread = useMutation(api.threads.create);
  const updateThreadTitle = useMutation(api.threads.rename);
  const deleteThread = useMutation(api.threads.remove);

  // Оптимизированные обертки для удобства использования
  const handleCreateThread = useCallback(async (title: string) => {
    if (!user) return null;
    const result = await createThread({
      title,
    });
    // Инвалидируем кэш после создания нового треда
    threadsCache.invalidate(userId);
    return result;
  }, [user, createThread, userId]);

  const handleUpdateThreadTitle = useCallback(async (threadId: Id<"threads">, title: string) => {
    await updateThreadTitle({ threadId, title });
    // Инвалидируем кэш после обновления
    threadsCache.invalidate(userId);
  }, [updateThreadTitle, userId]);

  const handleDeleteThread = useCallback(async (threadId: Id<"threads">) => {
    await deleteThread({ threadId });
    // Инвалидируем кэш после удаления
    threadsCache.invalidate(userId);
  }, [deleteThread, userId]);

  // Функция для предзагрузки данных
  const prefetchThreads = useCallback(() => {
    if (!user) return;
    
    const cached = threadsCache.prefetch(userId);
    if (cached) {
      setCachedThreads(cached.threads);
      setHasInitialData(true);
    }
  }, [user, userId]);

  // Быстрая проверка наличия кэша
  const hasValidCache = useCallback(() => {
    return threadsCache.hasValidCache(userId);
  }, [userId]);

  // Получение только заголовков для быстрого отображения
  const getThreadTitles = useCallback(() => {
    return threadsCache.getThreadTitles(userId);
  }, [userId]);

  // Возвращаем кэшированные данные если они есть, иначе загружаемые
  const finalThreads = hasInitialData ? cachedThreads : (threads || []);
  const isLoading = !hasInitialData && threads === undefined;

  return {
    threads: finalThreads,
    isLoading,
    isLoadingFromCache,
    createThread: handleCreateThread,
    updateThreadTitle: handleUpdateThreadTitle,
    deleteThread: handleDeleteThread,
    prefetchThreads,
    hasCache: hasInitialData,
    hasValidCache,
    getThreadTitles,
  };
}
