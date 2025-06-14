import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useConvexMessages(threadId: Id<"threads"> | null) {
  // Получение сообщений треда
  const messages = useQuery(
    api.messages.getThreadMessages,
    threadId ? { threadId } : "skip"
  );

  // Мутации
  const addMessage = useMutation(api.messages.addMessage);
  const updateMessage = useMutation(api.messages.updateMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const deleteMessagesAfter = useMutation(api.messages.deleteMessagesAfter);

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