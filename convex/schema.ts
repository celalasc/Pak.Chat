// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table synchronized with Firebase
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  // User settings including encrypted API keys
  userSettings: defineTable({
    userId: v.id("users"),
    encryptedApiKeys: v.string(),
    uiFont: v.optional(v.string()),
    codeFont: v.optional(v.string()),
    hidePersonal: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  // Chat threads
  threads: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    pinned: v.optional(v.boolean()),
    clonedFrom: v.optional(v.id("threads")),
    forkedFromMessageId: v.optional(v.id("messages")),
  }).index("by_user_and_time", ["userId", "createdAt"]),

  // Messages
  messages: defineTable({
    threadId: v.id("threads"),
    authorId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
    // Optional version for concurrent-safe updates
    version: v.optional(v.number()),
  }).index("by_thread_and_time", ["threadId", "createdAt"]),

  // Attachments for messages
  attachments: defineTable({
    threadId: v.id("threads"),
    fileId: v.string(),
    name: v.string(),
    type: v.string(),
    messageId: v.optional(v.id("messages")),
  })
    .index("by_thread", ["threadId"])
    .index("by_message", ["messageId"]),

  // Message edit history
  messageVersions: defineTable({
    messageId: v.id("messages"),
    content: v.string(),
    editedAt: v.number(),
  }).index("by_message", ["messageId"]),
});
