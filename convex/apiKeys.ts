import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get current user ID from auth
async function getCurrentUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
    .unique();
    
  return user?._id;
}

// Get API keys for the current user
export const getApiKeys = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      return null;
    }

    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!apiKeys) {
      return {
        google: "",
        openrouter: "",
        openai: "",
        groq: "",
      };
    }

    return {
      google: apiKeys.google || "",
      openrouter: apiKeys.openrouter || "",
      openai: apiKeys.openai || "",
      groq: apiKeys.groq || "",
    };
  },
});

// Set API keys for the current user
export const setApiKeys = mutation({
  args: {
    google: v.optional(v.string()),
    openrouter: v.optional(v.string()),
    openai: v.optional(v.string()),
    groq: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        google: args.google || "",
        openrouter: args.openrouter || "",
        openai: args.openai || "",
        groq: args.groq || "",
        encryptedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("apiKeys", {
        userId,
        google: args.google || "",
        openrouter: args.openrouter || "",
        openai: args.openai || "",
        groq: args.groq || "",
        encryptedAt: Date.now(),
      });
    }
  },
}); 