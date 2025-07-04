// convex/messages.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { currentUserId } from "./utils";
import { encrypt, tryDecrypt } from "./encryption";

/** Get messages for a thread */
export const get = query({
  args: {
    threadId: v.id("threads"),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (uid === null) {
      // No user record yet, so no messages to return
      return [];
    }
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Thread not found or permission denied");
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();
    
    // Decrypt message contents and load attachments
    const decrypted = await Promise.all(
      msgs.map(async (m) => {
        // Load attachments for this message
        const attachments = await ctx.db
          .query("attachments")
          .withIndex("by_message", (q) => q.eq("messageId", m._id))
          .collect();
        
        // Get URLs for attachments
        const attachmentsWithUrls = await Promise.all(
          attachments.map(async (a) => {
            let url: string | null = null;
            let originalUrl: string | null = null;
            
            if (a.type.startsWith('image/')) {
              // Always get original URL for images
              originalUrl = await ctx.storage.getUrl(a.fileId);
              
              // Use preview for small thumbnails if available
              if (a.previewId) {
                url = await ctx.storage.getUrl(a.previewId);
              } else {
                url = originalUrl; // Fallback to original if no preview
              }
            } else {
              // For non-image files, always use original
              url = await ctx.storage.getUrl(a.fileId);
              originalUrl = url;
            }
            
            return {
              id: a._id,
              url,
              originalUrl, // Add original URL for high-quality viewing
              name: a.name,
              type: a.type,
              ext: a.name.split('.').pop() ?? '',
              size: a.size,
              width: a.width,
              height: a.height,
            };
          })
        );
        
        return { 
          ...m, 
          content: await tryDecrypt(m.content),
          attachments: attachmentsWithUrls,
          metadata: (m as any).metadata, // Включаем metadata в ответ
        };
      })
    );
    return decrypted;
  },
});

/** Get a single message by ID */
export const getOne = query({
  args: { messageId: v.id("messages") },
  async handler(ctx, { messageId }) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: User identity not found.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("Unauthenticated: User not found in database.");
    }

    const msg = await ctx.db.get(messageId);
    if (!msg) {
      return null;
    }

    const thread = await ctx.db.get(msg.threadId);
    if (!thread || thread.userId !== user._id) {
      throw new Error("Permission denied: User does not own this thread.");
    }

    return { 
      ...msg, 
      content: await tryDecrypt(msg.content),
      metadata: (msg as any).metadata, // Включаем metadata в ответ
    };
  },
});

/** Get latest messages for preview */
export const preview = query({
  args: { threadId: v.id("threads"), limit: v.optional(v.number()) },
  async handler(ctx, { threadId, limit }) {
    const uid = await currentUserId(ctx);
    if (uid === null) return [];
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== uid) return [];
    
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", threadId))
      .order("desc")
      .collect();

    const decrypted = await Promise.all(
      msgs.map(async (m) => {
        const attachments = await ctx.db
          .query("attachments")
          .withIndex("by_message", (q) => q.eq("messageId", m._id))
          .collect();

        const attachmentsWithUrls = await Promise.all(
          attachments.map(async (a) => {
            let url: string | null = null;
            let originalUrl: string | null = null;
            
            if (a.type.startsWith('image/')) {
              // Always get original URL for images
              originalUrl = await ctx.storage.getUrl(a.fileId);
              
              // Use preview for small thumbnails if available
              if (a.previewId) {
                url = await ctx.storage.getUrl(a.previewId);
              } else {
                url = originalUrl; // Fallback to original if no preview
              }
            } else {
              // For non-image files, always use original
              url = await ctx.storage.getUrl(a.fileId);
              originalUrl = url;
            }
            
            return {
              id: a._id,
              url,
              originalUrl, // Add original URL for high-quality viewing
              name: a.name,
              type: a.type,
              ext: a.name.split('.').pop() ?? '',
              size: a.size,
              width: a.width,
              height: a.height,
            };
          })
        );

        return {
          ...m,
          content: await tryDecrypt(m.content),
          attachments: attachmentsWithUrls,
          metadata: (m as any).metadata, // Включаем metadata в ответ
        };
      })
    );
    return decrypted.slice(0, limit ?? 4);
  },
});

/** Send a message */
export const send = mutation({
  args: {
    threadId: v.id("threads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    model: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    if (!args.content.trim()) throw new Error("Empty message");
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Thread not found or permission denied");
    const id = await ctx.db.insert("messages", {
      threadId: args.threadId,
      authorId: uid,
      role: args.role,
      content: await encrypt(args.content),
      createdAt: Date.now(),
      model: args.model,
      metadata: args.metadata,
    });
    // Clear saved draft after successful send
    await ctx.db.patch(args.threadId, { draft: "" });
    return id as Id<"messages">;
  },
});

/** Edit an existing message */
export const edit = mutation({
  args: { messageId: v.id("messages"), content: v.string() },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    const thread = await ctx.db.get(message.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Permission denied");
    await ctx.db.patch(args.messageId, { content: await encrypt(args.content) });
  },
});

/** Delete a message */
export const remove = mutation({
  args: { messageId: v.id("messages") },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const msg = await ctx.db.get(args.messageId);
    if (!msg) return;
    const thread = await ctx.db.get(msg.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Permission denied");
    await ctx.db.delete(args.messageId);
  },
});

/** Remove all messages after a given one */
export const removeAfter = mutation({
  args: { threadId: v.id("threads"), afterMessageId: v.id("messages") },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Permission denied");
    const after = await ctx.db.get(args.afterMessageId);
    if (!after || after.threadId !== args.threadId)
      throw new Error("Message mismatch");
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) =>
        q
          .eq("threadId", args.threadId)
          .gt("createdAt", after.createdAt)
      )
      .collect();
    await Promise.all(msgs.map((m) => ctx.db.delete(m._id)));
  },
});

/** Atomically prepare history for regeneration */
export const prepareForRegeneration = mutation({
  args: {
    threadId: v.id('threads'),
    userMessageId: v.id('messages'),
  },
  async handler(ctx, { threadId, userMessageId }) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error('Unauthenticated');

    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== uid) throw new Error('Permission denied');

    const userMessage = await ctx.db.get(userMessageId);
    if (
      !userMessage ||
      userMessage.threadId !== threadId ||
      userMessage.role !== 'user'
    ) {
      throw new Error('User message not found or invalid.');
    }

    const toDelete = await ctx.db
      .query('messages')
      .withIndex('by_thread_and_time', (q) =>
        q.eq('threadId', threadId).gt('createdAt', userMessage.createdAt)
      )
      .collect();

    await Promise.all(toDelete.map((m) => ctx.db.delete(m._id)));

    return { 
      ...userMessage, 
      content: await tryDecrypt(userMessage.content),
      metadata: (userMessage as any).metadata, // Включаем metadata в ответ
    };
  },
});
