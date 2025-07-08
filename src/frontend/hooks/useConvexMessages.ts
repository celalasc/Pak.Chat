import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useConvexMessages(threadId: Id<"threads"> | null) {
  // Получение сообщений треда
  const messages = useQuery(
    api.messages.get,
    threadId ? { threadId } : "skip"
  );

  // Мутации
  const addMessage = useMutation<typeof api.messages.send>(api.messages.send);
  const updateMessage = useMutation(api.messages.edit);
  const deleteMessage = useMutation(api.messages.remove);
  const deleteMessagesAfter = useMutation(api.messages.removeAfter);

  // Обертки для удобства использования
  const handleAddMessage = async (
    role: "user" | "assistant",
    content: string
  ) => {
    if (!threadId) return null;
    return await addMessage({
      threadId,
      role,
      content,
    });
  };

  const handleUpdateMessage = async (
    messageId: Id<"messages">,
    content: string
  ) => {
    await updateMessage({ messageId, content });
  };

  const handleDeleteMessage = async (messageId: Id<"messages">) => {
    await deleteMessage({ messageId });
  };

  const handleDeleteMessagesAfter = async (afterMessageId: Id<"messages">) => {
    if (!threadId) return;
    await deleteMessagesAfter({ threadId, afterMessageId });
  };

  return {
    messages: messages || [],
    isLoading: messages === undefined,
    addMessage: handleAddMessage,
    updateMessage: handleUpdateMessage,
    deleteMessage: handleDeleteMessage,
    deleteMessagesAfter: handleDeleteMessagesAfter,
  };
} 