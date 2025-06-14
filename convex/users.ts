// convex/users.ts
import { internalMutation, internalQuery } from "./_generated/server";
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
