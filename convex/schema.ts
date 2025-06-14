import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Таблица для хранения чатов (тредов)
  threads: defineTable({
    title: v.string(),
    userId: v.string(), // ID пользователя, создавшего тред
  }).index("by_user", ["userId"]), // Индекс для быстрого поиска чатов по пользователю

  // Таблица для хранения сообщений
  messages: defineTable({
    threadId: v.id("threads"), // Ссылка на тред
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  }).index("by_thread", ["threadId"]), // Индекс для быстрого поиска сообщений в треде
}); 