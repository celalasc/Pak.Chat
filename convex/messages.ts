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

    // Always return the full message history in chronological order. If the client needs
    // pagination it can be implemented client-side in the future.
    return await q.collect();
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
