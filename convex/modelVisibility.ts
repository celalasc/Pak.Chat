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

// Get model visibility settings for the current user
export const getModelVisibility = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      return null;
    }

    const settings = await ctx.db
      .query("modelVisibility")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!settings) {
      return {
        favoriteModels: [],
        enabledProviders: ["google", "openrouter", "openai", "groq"],
      };
    }

    return {
      favoriteModels: settings.favoriteModels || [],
      enabledProviders: settings.enabledProviders || ["google", "openrouter", "openai", "groq"],
    };
  },
});

// Set model visibility settings for the current user
export const setModelVisibility = mutation({
  args: {
    favoriteModels: v.array(v.string()),
    enabledProviders: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("modelVisibility")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        favoriteModels: args.favoriteModels,
        enabledProviders: args.enabledProviders,
      });
    } else {
      await ctx.db.insert("modelVisibility", {
        userId,
        favoriteModels: args.favoriteModels,
        enabledProviders: args.enabledProviders,
      });
    }
  },
}); 