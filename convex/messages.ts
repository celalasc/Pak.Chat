// convex/messages.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { currentUserId } from "./utils";

/** Get messages for a thread */
export const get = query({
  args: {
    threadId: v.id("threads"),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (uid === null) {
      // No user record yet, so no messages to return
      return [];
    }
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Thread not found or permission denied");
    const q = ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", args.threadId))
      .order("asc");
      return await q.paginate({
        cursor: args.cursor ?? null,
        numItems: args.limit ?? 50,
      });
  },
});

/** Get a single message by ID */
export const getOne = query({
  args: { messageId: v.id("messages") },
  async handler(ctx, { messageId }) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: User identity not found.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("Unauthenticated: User not found in database.");
    }

    const msg = await ctx.db.get(messageId);
    if (!msg) {
      return null;
    }

    const thread = await ctx.db.get(msg.threadId);
    if (!thread || thread.userId !== user._id) {
      throw new Error("Permission denied: User does not own this thread.");
    }

    return msg;
  },
});

/** Get latest messages for preview */
export const preview = query({
  args: { threadId: v.id("threads"), limit: v.optional(v.number()) },
  async handler(ctx, { threadId, limit }) {
    const uid = await currentUserId(ctx);
    if (uid === null) return [];
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== uid) return [];
    return ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", threadId))
      .order("desc")
      .take(limit ?? 4);
  },
});

/** Send a message */
export const send = mutation({
  args: {
    threadId: v.id("threads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    model: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    if (!args.content.trim()) throw new Error("Empty message");
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Thread not found or permission denied");
    const id = await ctx.db.insert("messages", {
      threadId: args.threadId,
      authorId: uid,
      role: args.role,
      content: args.content,
      createdAt: Date.now(),
      version: 0,
      model: args.model,
    });
    return id as Id<"messages">;
  },
});

/** Edit an existing message */
export const edit = mutation({
  args: { messageId: v.id("messages"), content: v.string() },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    const thread = await ctx.db.get(message.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Permission denied");
    await ctx.db.insert("messageVersions", {
      messageId: args.messageId,
      content: message.content,
      editedAt: Date.now(),
    });
    await ctx.db.patch(args.messageId, { content: args.content });
  },
});

/** Delete a message */
export const remove = mutation({
  args: { messageId: v.id("messages") },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const msg = await ctx.db.get(args.messageId);
    if (!msg) return;
    const thread = await ctx.db.get(msg.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Permission denied");
    await ctx.db.delete(args.messageId);
  },
});

/** Remove all messages after a given one */
export const removeAfter = mutation({
  args: { threadId: v.id("threads"), afterMessageId: v.id("messages") },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Permission denied");
    const after = await ctx.db.get(args.afterMessageId);
    if (!after || after.threadId !== args.threadId)
      throw new Error("Message mismatch");
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) =>
        q
          .eq("threadId", args.threadId)
          .gt("createdAt", after.createdAt)
      )
      .collect();
    await Promise.all(msgs.map((m) => ctx.db.delete(m._id)));
  },
});

/** Atomically prepare history for regeneration */
export const prepareForRegeneration = mutation({
  args: {
    threadId: v.id('threads'),
    userMessageId: v.id('messages'),
  },
  async handler(ctx, { threadId, userMessageId }) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error('Unauthenticated');

    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== uid) throw new Error('Permission denied');

    const userMessage = await ctx.db.get(userMessageId);
    if (
      !userMessage ||
      userMessage.threadId !== threadId ||
      userMessage.role !== 'user'
    ) {
      throw new Error('User message not found or invalid.');
    }

    const toDelete = await ctx.db
      .query('messages')
      .withIndex('by_thread_and_time', (q) =>
        q.eq('threadId', threadId).gt('createdAt', userMessage.createdAt)
      )
      .collect();

    await Promise.all(toDelete.map((m) => ctx.db.delete(m._id)));

    return userMessage;
  },
});

/** Partially update message content with version check */
export const patchContent = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    // Client-provided version number for optimistic concurrency
    version: v.number(),
  },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const thread = await ctx.db.get(message.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Permission denied");

    const currentVersion = message.version ?? 0;

    // Avoid overwriting newer content from another tab
    if (args.version >= currentVersion) {
      await ctx.db.patch(args.messageId, {
        content: args.content,
        version: args.version,
      });
    }
  },
});

/** Finalize message after streaming ends and clean versions */
export const finalize = mutation({
  args: { messageId: v.id("messages") },
  async handler(ctx, { messageId }) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const msg = await ctx.db.get(messageId);
    if (!msg) return;
    const thread = await ctx.db.get(msg.threadId);
    if (!thread || thread.userId !== uid) throw new Error("Permission denied");

    await ctx.db.patch(messageId, { version: 0 });

    const versions = await ctx.db
      .query("messageVersions")
      .withIndex("by_message", (q) => q.eq("messageId", messageId))
      .collect();
    await Promise.all(versions.map((v) => ctx.db.delete(v._id)));
  },
});

export const saveVersion = mutation({
  args: { messageId: v.id("messages") },
  async handler(ctx, { messageId }) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const msg = await ctx.db.get(messageId);
    if (!msg) throw new Error("Message not found");
    const thread = await ctx.db.get(msg.threadId);
    if (!thread || thread.userId !== uid) throw new Error("Permission denied");

    const history = msg.history ?? [];
    // keep previous content and model in version history
    history.push({
      content: msg.content,
      createdAt: Date.now(),
      model: msg.model ?? "unknown",
    });

    await ctx.db.patch(messageId, {
      history,
      isEdited: true,
      activeHistoryIndex: history.length - 1,
      version: (msg.version ?? 0) + 1,
    });
  },
});

export const switchVersion = mutation({
  args: {
    messageId: v.id("messages"), // user message id
    direction: v.union(v.literal("next"), v.literal("prev")),
  },
  async handler(ctx, { messageId, direction }) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const msg = await ctx.db.get(messageId);
    if (!msg || !msg.history || msg.history.length === 0) return;

    const thread = await ctx.db.get(msg.threadId);
    if (!thread || thread.userId !== uid) throw new Error("Permission denied");

    let index = msg.activeHistoryIndex ?? msg.history.length - 1;
    if (direction === "next") {
      index = Math.min(index + 1, msg.history.length - 1);
    } else {
      index = Math.max(index - 1, 0);
    }

    const versionToRestore = msg.history[index];

    const assistantMessage = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", q =>
        q.eq("threadId", msg.threadId).gt("createdAt", msg.createdAt)
      )
      .first();

    if (assistantMessage && assistantMessage.role === "assistant") {
      await ctx.db.patch(assistantMessage._id, {
        content: versionToRestore.content,
      });
    }

    await ctx.db.patch(messageId, {
      activeHistoryIndex: index,
    });

    return versionToRestore;
  },
});

/** Save previous assistant answer as version for a user message */
export const saveAnswerVersion = mutation({
  args: {
    userMessageId: v.id("messages"),
    answerContent: v.string(),
    answerModel: v.string(),
  },
  async handler(ctx, { userMessageId, answerContent, answerModel }) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const userMsg = await ctx.db.get(userMessageId);
    if (!userMsg) throw new Error("Message not found");
    const thread = await ctx.db.get(userMsg.threadId);
    if (!thread || thread.userId !== uid) throw new Error("Permission denied");

    const history = userMsg.history ?? [];
    history.push({ content: answerContent, createdAt: Date.now(), model: answerModel });
    await ctx.db.patch(userMessageId, {
      history,
      activeHistoryIndex: history.length - 1,
    });
  },
});
