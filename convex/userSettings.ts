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
    if (uid === null) {
      // User record not yet created
      return null;
    }
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
    if (!uid) throw new Error("Unauthenticated");
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

/** Save UI settings such as fonts and personal data flag */
export const saveSettings = mutation({
  args: {
    uiFont: v.string(),
    codeFont: v.string(),
    hidePersonal: v.boolean(),
    showNavBars: v.optional(v.boolean()),
    showChatPreview: v.optional(v.boolean()),
    isCustomModesEnabled: v.optional(v.boolean()),
    selectedMode: v.optional(v.string()),
    webSearchEnabled: v.optional(v.boolean()),
    selectedModel: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error('Unauthenticated');
    
    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', uid))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        uiFont: args.uiFont,
        codeFont: args.codeFont,
        hidePersonal: args.hidePersonal,
        showNavBars: args.showNavBars,
        showChatPreview: args.showChatPreview,
        isCustomModesEnabled: args.isCustomModesEnabled,
        selectedMode: args.selectedMode,
        webSearchEnabled: args.webSearchEnabled,
        selectedModel: args.selectedModel,
      });
    } else {
      await ctx.db.insert('userSettings', {
        userId: uid,
        encryptedApiKeys: '',
        uiFont: args.uiFont,
        codeFont: args.codeFont,
        hidePersonal: args.hidePersonal,
        showNavBars: args.showNavBars,
        showChatPreview: args.showChatPreview,
        isCustomModesEnabled: args.isCustomModesEnabled,
        selectedMode: args.selectedMode,
        webSearchEnabled: args.webSearchEnabled,
        selectedModel: args.selectedModel,
      });
    }
  },
});

/** Save custom instructions for AI behavior */
export const saveCustomInstructions = mutation({
  args: {
    customInstructionsName: v.optional(v.string()),
    customInstructionsOccupation: v.optional(v.string()),
    customInstructionsTraits: v.optional(v.array(v.string())),
    customInstructionsTraitsText: v.optional(v.string()),
    customInstructionsAdditionalInfo: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error('Unauthenticated');
    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', uid))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        customInstructionsName: args.customInstructionsName,
        customInstructionsOccupation: args.customInstructionsOccupation,
        customInstructionsTraits: args.customInstructionsTraits,
        customInstructionsTraitsText: args.customInstructionsTraitsText,
        customInstructionsAdditionalInfo: args.customInstructionsAdditionalInfo,
      });
    } else {
      await ctx.db.insert('userSettings', {
        userId: uid,
        encryptedApiKeys: '',
        customInstructionsName: args.customInstructionsName,
        customInstructionsOccupation: args.customInstructionsOccupation,
        customInstructionsTraits: args.customInstructionsTraits,
        customInstructionsTraitsText: args.customInstructionsTraitsText,
        customInstructionsAdditionalInfo: args.customInstructionsAdditionalInfo,
      });
    }
  },
});

/** Save image generation settings */
export const saveImageGenerationSettings = mutation({
  args: {
    imageGenerationModel: v.optional(v.string()),
    imageGenerationSize: v.optional(v.string()),
    imageGenerationQuality: v.optional(v.string()),
    imageGenerationCount: v.optional(v.number()),
    imageGenerationFormat: v.optional(v.string()),
    imageGenerationCompression: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error('Unauthenticated');
    
    // Validate arguments
    if (args.imageGenerationModel && args.imageGenerationModel !== 'gpt-image-1') {
      throw new Error('Invalid image generation model');
    }
    if (args.imageGenerationSize && !['auto', '1024x1024', '1024x1536', '1536x1024'].includes(args.imageGenerationSize)) {
      throw new Error('Invalid image generation size');
    }
    if (args.imageGenerationQuality && !['auto', 'low', 'medium', 'high'].includes(args.imageGenerationQuality)) {
      throw new Error('Invalid image generation quality');
    }
    if (args.imageGenerationCount && (args.imageGenerationCount < 1 || args.imageGenerationCount > 4)) {
      throw new Error('Invalid image generation count');
    }
    if (args.imageGenerationFormat && !['png', 'jpeg', 'webp'].includes(args.imageGenerationFormat)) {
      throw new Error('Invalid image generation format');
    }
    if (args.imageGenerationCompression && (args.imageGenerationCompression < 0 || args.imageGenerationCompression > 100)) {
      throw new Error('Invalid image generation compression');
    }
    
    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', uid))
      .unique();
      
    if (existing) {
      await ctx.db.patch(existing._id, {
        imageGenerationModel: args.imageGenerationModel,
        imageGenerationSize: args.imageGenerationSize,
        imageGenerationQuality: args.imageGenerationQuality,
        imageGenerationCount: args.imageGenerationCount,
        imageGenerationFormat: args.imageGenerationFormat,
        imageGenerationCompression: args.imageGenerationCompression,
      });
    } else {
      await ctx.db.insert('userSettings', {
        userId: uid,
        encryptedApiKeys: '',
        imageGenerationModel: args.imageGenerationModel,
        imageGenerationSize: args.imageGenerationSize,
        imageGenerationQuality: args.imageGenerationQuality,
        imageGenerationCount: args.imageGenerationCount,
        imageGenerationFormat: args.imageGenerationFormat,
        imageGenerationCompression: args.imageGenerationCompression,
      });
    }
  },
});

/** Get user settings by thread ID (for API endpoints) */
export const getByThreadId = query({
  args: { threadId: v.id("threads") },
  async handler(ctx, args) {
    // Get the thread first to find the user
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return null;
    }
    
    // Get user settings for the thread owner
    const userSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", thread.userId))
      .unique();
      
    return userSettings;
  },
});

/** Get user settings by Firebase UID (for API endpoints when no threadId) */
export const getByFirebaseUid = query({
  args: { firebaseUid: v.string() },
  async handler(ctx, args) {
    // Find user by Firebase UID
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.firebaseUid))
      .unique();
      
    if (!user) {
      return null;
    }
    
    // Get user settings
    const userSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
      
    return userSettings;
  },
});
