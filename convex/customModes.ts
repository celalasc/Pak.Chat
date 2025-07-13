import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentUserId } from "./utils";

export const listCustomModes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await currentUserId(ctx);
    if (!userId) {
      return [];
    }

    const modes = await ctx.db
      .query("customModes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return modes;
  },
});

export const createCustomMode = mutation({
  args: {
    name: v.string(),
    systemPrompt: v.string(),
    icon: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const now = Date.now();
    const modeId = await ctx.db.insert("customModes", {
      userId: userId,
      name: args.name,
      systemPrompt: args.systemPrompt,
      icon: args.icon,
      createdAt: now,
      updatedAt: now,
    });

    return modeId;
  },
});

export const updateCustomMode = mutation({
  args: {
    id: v.id("customModes"),
    name: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const mode = await ctx.db.get(args.id);
    if (!mode || mode.userId !== userId) {
      throw new Error("Custom mode not found or unauthorized");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.systemPrompt !== undefined) updates.systemPrompt = args.systemPrompt;
    if (args.icon !== undefined) updates.icon = args.icon;

    await ctx.db.patch(args.id, updates);
  },
});

export const deleteCustomMode = mutation({
  args: {
    id: v.id("customModes"),
  },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const mode = await ctx.db.get(args.id);
    if (!mode || mode.userId !== userId) {
      throw new Error("Custom mode not found or unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});