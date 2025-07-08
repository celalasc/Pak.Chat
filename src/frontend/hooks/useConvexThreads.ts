import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/frontend/stores/AuthStore";
import { Id } from "@/convex/_generated/dataModel";

export function useConvexThreads() {
  const { user } = useAuthStore();
  
  // Получение тредов пользователя
  const threads = useQuery(
    api.threads.list,
    user ? {} : "skip"
  );

  // Мутации
  const createThread = useMutation(api.threads.create);
  const updateThreadTitle = useMutation(api.threads.rename);
  const deleteThread = useMutation(api.threads.remove);

  // Обертки для удобства использования
  const handleCreateThread = async (title: string) => {
    if (!user) return null;
    return await createThread({
      title,
    });
  };

  const handleUpdateThreadTitle = async (threadId: Id<"threads">, title: string) => {
    await updateThreadTitle({ threadId, title });
  };

  const handleDeleteThread = async (threadId: Id<"threads">) => {
    await deleteThread({ threadId });
  };

  return {
    threads: threads || [],
    isLoading: threads === undefined,
    createThread: handleCreateThread,
    updateThreadTitle: handleUpdateThreadTitle,
    deleteThread: handleDeleteThread,
  };
} 