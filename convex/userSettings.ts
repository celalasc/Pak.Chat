// convex/userSettings.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { currentUserId } from "./utils";

/** Get encrypted API keys for the current user */
export const get = query({
  args: {},
  async handler(ctx) {
    const uid = await currentUserId(ctx);
    return ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", uid))
      .unique();
  },
});

/** Save encrypted API keys */
export const saveApiKeys = mutation({
  args: { encryptedApiKeys: v.string() },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", uid))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedApiKeys: args.encryptedApiKeys,
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId: uid,
        encryptedApiKeys: args.encryptedApiKeys,
      });
    }
  },
});
