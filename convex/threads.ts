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

/** Create a new thread */
export const create = mutation({
  args: { title: v.string() },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    return ctx.db.insert("threads", {
      userId: uid,
      title: args.title,
      createdAt: Date.now(),
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
      parentThreadId: args.threadId,
    });
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", args.threadId))
      .collect();
    await Promise.all(
      messages.map((m) =>
        ctx.db.insert("messages", {
          threadId: newThreadId,
          authorId: m.authorId,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })
      )
    );
    return newThreadId;
  },
});


