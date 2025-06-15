// convex/users.ts
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const findByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .unique();
  },
});

export const create = internalMutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    tokenIdentifier: v.string(),
  },
  handler: (ctx, args) => {
    return ctx.db.insert("users", args);
  },
});

export const update = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: (ctx, args) => {
    return ctx.db.patch(args.userId, {
      name: args.name,
      avatarUrl: args.avatarUrl,
    });
  },
});

/** Fetch the currently authenticated user if present. */
export const getCurrent = query({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
  },
});

/** Sync user data from Firebase Auth */
export const sync = mutation({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    // When a user signs in, the token may take a moment to attach. In that case
    // we exit quietly so the client can retry.
    if (!identity) {
      return null;
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (existingUser) {
      if (
        existingUser.name !== identity.name ||
        existingUser.avatarUrl !== identity.pictureUrl
      ) {
        await ctx.db.patch(existingUser._id, {
          name: identity.name!,
          avatarUrl: identity.pictureUrl,
        });
      }
      return existingUser._id;
    } else {
      return await ctx.db.insert("users", {
        name: identity.name!,
        email: identity.email,
        avatarUrl: identity.pictureUrl,
        tokenIdentifier: identity.subject,
      });
    }
  },
});
