// convex/userSettings.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/** Get encrypted API keys for the current user */
export const get = query({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    return ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
  },
});

/** Save encrypted API keys */
export const saveApiKeys = mutation({
  args: { encryptedApiKeys: v.string() },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedApiKeys: args.encryptedApiKeys,
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId: identity.subject as Id<"users">,
        encryptedApiKeys: args.encryptedApiKeys,
      });
    }
  },
});
