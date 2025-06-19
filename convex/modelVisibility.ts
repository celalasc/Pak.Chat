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

    const existing = await ctx.db
      .query("modelVisibility")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existing) {
      return {
        favoriteModels: [],
        enabledProviders: ["google", "openrouter", "openai", "groq"],
      };
    }

    return {
      favoriteModels: existing.favoriteModels || [],
      enabledProviders: existing.enabledProviders || ["google", "openrouter", "openai", "groq"],
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

    const allDocs = await ctx.db
      .query("modelVisibility")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let existing = allDocs.find((d) => d.favoriteModels && d.favoriteModels.length > 0) || null;
    if (!existing && allDocs.length > 0) {
      existing = allDocs.reduce((latest, doc) => (doc._creationTime > latest._creationTime ? doc : latest), allDocs[0]);
    }

    // delete duplicates (any besides existing)
    if (allDocs.length > 1) {
      for (const doc of allDocs) {
        if (!existing || doc._id !== existing._id) {
          await ctx.db.delete(doc._id);
        }
      }
    }

    const updateData = {
      favoriteModels: args.favoriteModels,
      enabledProviders: args.enabledProviders,
    };

    if (existing) {
      await ctx.db.patch(existing._id, updateData);
    } else {
      await ctx.db.insert("modelVisibility", {
        userId,
        favoriteModels: args.favoriteModels,
        enabledProviders: args.enabledProviders,
      });
    }
  },
}); 