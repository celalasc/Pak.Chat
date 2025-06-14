import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Retrieve all messages in a thread if the authenticated user owns it.
 */
export const get = query({
  args: { threadId: v.id("threads") },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User is not authenticated.");
    }

    // Verify the user has access to the thread.
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== identity.subject) {
      throw new Error("Thread not found or user does not have permission.");
    }

    return ctx.db
      .query("messages")
      .withIndex("by_thread", q => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();
  },
});

/**
 * Insert a new message in the specified thread. Only the owner may send.
 */
export const send = mutation({
  args: {
    threadId: v.id("threads"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User is not authenticated.");
    }

    // Ensure the thread belongs to the current user.
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== identity.subject) {
      throw new Error("Thread not found or user does not have permission.");
    }

    await ctx.db.insert("messages", {
      threadId: args.threadId,
      role: args.role,
      content: args.content,
    });
  },
});
