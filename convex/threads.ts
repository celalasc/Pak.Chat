// convex/threads.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { currentUserId } from "./utils";

/** Get a single thread by ID */
export const get = query({
  args: { threadId: v.id("threads") },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (uid === null) {
      return null;
    }
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== uid) {
      return null;
    }
    return thread;
  },
});

/** List threads for the authenticated user ordered by creation time */
export const list = query({
  args: {},
  async handler(ctx) {
    const uid = await currentUserId(ctx);
    if (uid === null) {
      // No user record yet means no threads to return
      return [];
    }
    return ctx.db
      .query("threads")
      .withIndex("by_user_and_time", (q) => q.eq("userId", uid))
      .order("desc")
      .collect();
  },
});

/** Search threads by title */
export const search = query({
  args: { searchQuery: v.string() },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (uid === null) return [];
    if (!args.searchQuery.trim()) {
      return ctx.db
        .query("threads")
        .withIndex("by_user_and_time", (q) => q.eq("userId", uid))
        .order("desc")
        .collect();
    }
    return ctx.db
      .query("threads")
      .withSearchIndex("by_title", (q) =>
        q.search("title", args.searchQuery).filter(q.eq("userId", uid))
      )
      .take(20);
  },
});

/** List system threads for the authenticated user */
export const listSystem = query({
  args: {},
  async handler(ctx) {
    const uid = await currentUserId(ctx);
    if (uid === null) {
      return [];
    }
    const all = await ctx.db
      .query("threads")
      .withIndex("by_user_and_time", (q) => q.eq("userId", uid))
      .collect();
    return all.filter((t) => t.system === true);
  },
});

/** Create a new thread */
export const create = mutation({
  args: { title: v.string(), system: v.optional(v.boolean()) },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    return ctx.db.insert("threads", {
      userId: uid,
      title: args.title,
      createdAt: Date.now(),
      pinned: false,
      system: args.system ?? false,
    });
  },
});

/** Rename a thread */
export const rename = mutation({
  args: { threadId: v.id("threads"), title: v.string() },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Thread not found or permission denied");
    await ctx.db.patch(args.threadId, { title: args.title });
  },
});

/** Remove a thread and all its messages */
export const remove = mutation({
  args: { threadId: v.id("threads") },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Thread not found or permission denied");
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", args.threadId))
      .collect();
    await Promise.all(messages.map((m) => ctx.db.delete(m._id)));
    await ctx.db.delete(args.threadId);
  },
});

/** Clone a thread by copying its messages */
export const clone = mutation({
  args: { threadId: v.id("threads"), title: v.string() },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Thread not found or permission denied");
    const newThreadId = await ctx.db.insert("threads", {
      userId: uid,
      title: args.title,
      createdAt: Date.now(),
      clonedFrom: args.threadId,
      pinned: false,
    });
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", args.threadId))
      .collect();

    const idMap = new Map<Id<"messages">, Id<"messages">>();

    await Promise.all(
      messages.map(async (m) => {
        const newId = await ctx.db.insert("messages", {
          threadId: newThreadId,
          authorId: m.authorId,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        });
        idMap.set(m._id, newId as Id<"messages">);
      })
    );

    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    await Promise.all(
      attachments.map((a) =>
        ctx.db.insert("attachments", {
          threadId: newThreadId,
          fileId: a.fileId,
          name: a.name,
          type: a.type,
          messageId: a.messageId ? idMap.get(a.messageId) : undefined,
        })
      )
    );
    return newThreadId;
  },
});

/** Toggle the pinned status of a thread */
export const togglePin = mutation({
  args: { threadId: v.id("threads"), pinned: v.boolean() },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Thread not found or permission denied");
    await ctx.db.patch(args.threadId, { pinned: args.pinned });
  },
});

/** Set the parent thread of an existing thread (used for clones) */
export const setParent = mutation({
  args: { threadId: v.id("threads"), parentId: v.id("threads") },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Thread not found or permission denied");
    await ctx.db.patch(args.threadId, { clonedFrom: args.parentId });
  },
});


