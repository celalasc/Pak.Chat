import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/frontend/stores/AuthStore";
import { Id } from "@/convex/_generated/dataModel";

export function useConvexThreads() {
  const { user } = useAuthStore();
  
  // Получение тредов пользователя
  const threads = useQuery(
    api.threads.getUserThreads,
    user ? { userId: user.uid } : "skip"
  );

  // Мутации
  const createThread = useMutation(api.threads.createThread);
  const updateThreadTitle = useMutation(api.threads.updateThreadTitle);
  const deleteThread = useMutation(api.threads.deleteThread);

  // Обертки для удобства использования
  const handleCreateThread = async (title: string) => {
    if (!user) return null;
    return await createThread({
      title,
      userId: user.uid,
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