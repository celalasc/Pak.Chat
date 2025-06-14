import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Получить все сообщения в треде
export const getThreadMessages = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();
  },
});

// Добавить новое сообщение
export const addMessage = mutation({
  args: {
    threadId: v.id("threads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      threadId: args.threadId,
      role: args.role,
      content: args.content,
    });
  },
});

// Обновить содержимое сообщения
export const updateMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { content: args.content });
  },
});

// Удалить сообщение
export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
  },
});

// Удалить все сообщения после определенного сообщения (для регенерации)
export const deleteMessagesAfter = mutation({
  args: { 
    threadId: v.id("threads"),
    afterMessageId: v.id("messages")
  },
  handler: async (ctx, args) => {
    // Получаем время создания сообщения, после которого нужно удалить
    const afterMessage = await ctx.db.get(args.afterMessageId);
    if (!afterMessage) return;

    // Получаем все сообщения в треде после указанного времени
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .filter((q) => q.gt(q.field("_creationTime"), afterMessage._creationTime))
      .collect();
    
    // Удаляем все найденные сообщения
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
  },
}); 