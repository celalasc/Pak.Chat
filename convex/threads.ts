import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Return all threads owned by the authenticated user.
 */
export const list = query({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User is not authenticated.");
    }

    // Look up threads by indexed userId field.
    return ctx.db
      .query("threads")
      .withIndex("by_user", q => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

/**
 * Create a new chat thread for the authenticated user.
 */
export const create = mutation({
  args: { title: v.string() },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User is not authenticated.");
    }

    // identity.subject is the provider user ID (Firebase UID).
    return ctx.db.insert("threads", {
      userId: identity.subject,
      title: args.title,
    });
  },
});

/**
 * Delete a thread along with all of its messages. Only the owner can do this.
 */
export const remove = mutation({
  args: { threadId: v.id("threads") },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User is not authenticated.");
    }

    const thread = await ctx.db.get(args.threadId);

    // Ensure the thread exists and belongs to the current user.
    if (!thread || thread.userId !== identity.subject) {
      throw new Error("Thread not found or user does not have permission.");
    }

    // Fetch and delete all messages associated with this thread.
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", q => q.eq("threadId", args.threadId))
      .collect();

    await Promise.all(messages.map(msg => ctx.db.delete(msg._id)));

    // Finally, remove the thread itself.
    await ctx.db.delete(args.threadId);
  },
});
