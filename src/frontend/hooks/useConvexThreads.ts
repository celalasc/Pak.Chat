import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/frontend/stores/AuthStore";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { threadsCache } from "@/frontend/lib/threadsCache";

export function useConvexThreads() {
  const { user } = useAuthStore();
  const [cachedThreads, setCachedThreads] = useState<Doc<"threads">[]>([]);
  const [hasInitialData, setHasInitialData] = useState(false);
  const userId = user?.id || 'anonymous';
  
  // Получение тредов пользователя
  const threads = useQuery(
    api.threads.list,
    user ? {} : "skip"
  );

  // Загружаем кэшированные данные при инициализации
  useEffect(() => {
    if (!user) return;
    
    const cached = threadsCache.get(userId);
    if (cached && !cached.isStale) {
      setCachedThreads(cached.threads);
      setHasInitialData(true);
    }
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

  // Обертки для удобства использования
  const handleCreateThread = async (title: string) => {
    if (!user) return null;
    const result = await createThread({
      title,
    });
    // Инвалидируем кэш после создания нового треда
    threadsCache.invalidate(userId);
    return result;
  };

  const handleUpdateThreadTitle = async (threadId: Id<"threads">, title: string) => {
    await updateThreadTitle({ threadId, title });
    // Инвалидируем кэш после обновления
    threadsCache.invalidate(userId);
  };

  const handleDeleteThread = async (threadId: Id<"threads">) => {
    await deleteThread({ threadId });
    // Инвалидируем кэш после удаления
    threadsCache.invalidate(userId);
  };

  // Функция для предзагрузки данных
  const prefetchThreads = () => {
    if (!user) return;
    
    const cached = threadsCache.prefetch(userId);
    if (cached) {
      setCachedThreads(cached.threads);
      setHasInitialData(true);
    }
  };

  // Возвращаем кэшированные данные если они есть, иначе загружаемые
  const finalThreads = hasInitialData ? cachedThreads : (threads || []);
  const isLoading = !hasInitialData && threads === undefined;

  return {
    threads: finalThreads,
    isLoading,
    createThread: handleCreateThread,
    updateThreadTitle: handleUpdateThreadTitle,
    deleteThread: handleDeleteThread,
    prefetchThreads,
    hasCache: hasInitialData,
  };
}
