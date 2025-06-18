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

    const all = await q.collect();
    
    // Use thread's currentDialogVersion as the source of truth
    let currentDialogVersion = thread.currentDialogVersion ?? 1;
    
    // Filter messages for the current dialog version
    return all.filter((m) => {
      // Legacy messages without dialogVersion are always shown (backward compatibility)
      if (m.dialogVersion === undefined) return true;
      
      // Both assistant and user messages: only show if they belong to current version and are active
      return m.dialogVersion === currentDialogVersion && (m.isActive ?? true);
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
    
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", threadId))
      .order("desc")
      .collect();
    
    // Use thread's currentDialogVersion as the source of truth
    let currentDialogVersion = thread.currentDialogVersion ?? 1;
    
    // Filter and take latest messages
    return msgs
      .filter((m) => {
        // Legacy messages without dialogVersion are always shown
        if (m.dialogVersion === undefined) return true;
        
        // Both assistant and user messages: only show if they belong to current version and are active
        return m.dialogVersion === currentDialogVersion && (m.isActive ?? true);
      })
      .slice(0, limit ?? 4);
  },
});

/** Send a message */
export const send = mutation({
  args: {
    threadId: v.id("threads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    model: v.optional(v.string()),
    dialogVersion: v.optional(v.number()),
    regeneratedFromMessageId: v.optional(v.id("messages")),
    isActive: v.optional(v.boolean()),
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
      dialogVersion: args.dialogVersion,
      isActive: args.isActive ?? true,
      regeneratedFromMessageId: args.regeneratedFromMessageId,
    });
    // Clear saved draft after successful send
    await ctx.db.patch(args.threadId, { draft: "" });
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

/** Create new dialog snapshot: mark current assistant messages inactive and return next dialog version */
export const createDialogSnapshot = mutation({
  args: { threadId: v.id("threads") },
  async handler(ctx, { threadId }) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Permission denied");

    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", threadId))
      .collect();

    let maxVersion = 1;
    // Mark ALL current active messages inactive (both user and assistant)
    await Promise.all(
      msgs.map(async (m) => {
        const v = m.dialogVersion ?? 1;
        if (v > maxVersion) maxVersion = v;
        // Deactivate all messages with defined dialogVersion that are currently active
        if (m.dialogVersion !== undefined && (m.isActive ?? true)) {
          await ctx.db.patch(m._id, { isActive: false });
        }
      })
    );

    const nextVersion = maxVersion + 1;
    // Update thread record with new current version
    await ctx.db.patch(threadId, { currentDialogVersion: nextVersion });
    return { dialogVersion: nextVersion } as const;
  },
});

/** Switch active dialog version */
export const switchDialogVersion = mutation({
  args: { threadId: v.id("threads"), dialogVersion: v.number() },
  async handler(ctx, { threadId, dialogVersion }) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Permission denied");

    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", threadId))
      .collect();

    await Promise.all(
      msgs.map(async (m) => {
        if (m.dialogVersion === undefined) return; // shared/legacy messages - leave unchanged
        
        // Both assistant and user messages: active only if they belong to the selected version
        const shouldBeActive = m.dialogVersion === dialogVersion;
        if ((m.isActive ?? true) !== shouldBeActive) {
          await ctx.db.patch(m._id, { isActive: shouldBeActive });
        }
      })
    );

    // Persist selected version on thread record
    await ctx.db.patch(threadId, { currentDialogVersion: dialogVersion });
  },
});

/** Get available dialog versions with counts */
export const getDialogVersions = query({
  args: { threadId: v.id("threads") },
  async handler(ctx, { threadId }) {
    const uid = await currentUserId(ctx);
    if (!uid) return [];
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== uid) return [];

    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", threadId))
      .collect();

    const map = new Map<number, { count: number; latest: number }>();
    msgs.forEach((m) => {
      const v = m.dialogVersion ?? 1;
      const entry = map.get(v) ?? { count: 0, latest: 0 };
      entry.count += 1;
      if (m.createdAt > entry.latest) entry.latest = m.createdAt;
      map.set(v, entry);
    });

    const versions = Array.from(map.entries()).map(([version, meta]) => ({
      version,
      messageCount: meta.count,
      latestAt: meta.latest,
    }));

    // sort ascending
    versions.sort((a, b) => a.version - b.version);
    return versions;
  },
});

/** Get current active dialog version for a thread */
export const getCurrentDialogVersion = query({
  args: { threadId: v.id("threads") },
  async handler(ctx, { threadId }) {
    const uid = await currentUserId(ctx);
    if (!uid) return 1;
    
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== uid) return 1;

    return thread.currentDialogVersion ?? 1;
  },
});
