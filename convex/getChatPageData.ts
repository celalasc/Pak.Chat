import { query } from "./_generated/server";
import { v } from "convex/values";
import { currentUserId } from "./utils";
import { tryDecrypt } from "./encryption";

export const getChatPageData = query({
  args: { threadId: v.optional(v.id("threads")) },
  handler: async (ctx, args) => {
    if (!args.threadId) return { thread: null, messages: [], attachments: [] };
    
    const uid = await currentUserId(ctx);
    if (!uid) return { thread: null, messages: [], attachments: [] };
    
    const threadId = args.threadId; // TypeScript now knows this is not undefined
    
    const [thread, messages, attachments] = await Promise.all([
      ctx.db.get(threadId),
      ctx.db.query("messages").withIndex("by_thread_and_time", q => q.eq("threadId", threadId)).order("asc").collect(),
      ctx.db.query("attachments").withIndex("by_thread", q => q.eq("threadId", threadId)).collect()
    ]);

    if (!thread || thread.userId !== uid) {
      return { thread: null, messages: [], attachments: [] };
    }

    // Decrypt message contents
    const decryptedMessages = await Promise.all(
      messages.map(async (m) => ({
        ...m,
        content: await tryDecrypt(m.content),
        metadata: (m as any).metadata,
      }))
    );

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
          ...a,
          url,
          originalUrl,
        };
      })
    );

    return { thread, messages: decryptedMessages, attachments: attachmentsWithUrls };
  },
});

