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
    // DEPRECATED: saveRegenerationHistory - no longer used
    saveRegenerationHistory: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  // API Keys stored securely in Convex
  apiKeys: defineTable({
    userId: v.id("users"),
    google: v.optional(v.string()),
    openrouter: v.optional(v.string()),
    openai: v.optional(v.string()),
    groq: v.optional(v.string()),
    encryptedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Model visibility settings
  modelVisibility: defineTable({
    userId: v.id("users"),
    favoriteModels: v.array(v.string()),
    enabledProviders: v.array(v.string()),
  }).index("by_user", ["userId"]),

  // Chat threads
  threads: defineTable({
    userId: v.id("users"),
    title: v.string(),
    system: v.optional(v.boolean()),
    createdAt: v.number(),
    pinned: v.optional(v.boolean()),
    clonedFrom: v.optional(v.id("threads")),
    forkedFromMessageId: v.optional(v.id("messages")),
    // Temporary unsent message text saved for this thread
    draft: v.optional(v.string()),
  })
    .index("by_user_and_time", ["userId", "createdAt"])
    .searchIndex("by_title", { searchField: "title" }),

  // Messages
  messages: defineTable({
    threadId: v.id("threads"),
    authorId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
    model: v.optional(v.string()),
    // Message metadata
  }).index("by_thread_and_time", ["threadId", "createdAt"]),

  // Attachments for messages
  attachments: defineTable({
    threadId: v.id("threads"),
    fileId: v.string(),
    name: v.string(),
    type: v.string(),
    messageId: v.optional(v.id("messages")),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    // ID of a downscaled preview image stored in Convex Storage (optional)
    previewId: v.optional(v.string()),
    // Original file size in bytes – helps decide when to lazy-load
    size: v.optional(v.number()),
  })
    .index("by_thread", ["threadId"])
    .index("by_message", ["messageId"]),

  // Publicly shared chat threads
  sharedThreads: defineTable({
    shareId: v.string(),
    originalThreadId: v.id("threads"),
    userId: v.id("users"),
    title: v.string(),
    isAnonymous: v.optional(v.boolean()),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
  }).index("by_share_id", ["shareId"]),

});
