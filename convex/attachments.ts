import { mutation, query } from './_generated/server';
import { Id } from './_generated/dataModel';
import { v } from 'convex/values';

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const save = mutation({
  args: {
    threadId: v.id('threads'),
    attachments: v.array(
      v.object({
        storageId: v.string(),
        name: v.string(),
        type: v.string(),
        messageId: v.union(v.string(), v.null()),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
      })
    ),
  },
  async handler(ctx, args) {
    const saved = await Promise.all(
      args.attachments.map(async (a) => {
        const attachmentId = await ctx.db.insert('attachments', {
          threadId: args.threadId,
          fileId: a.storageId,
          name: a.name,
          type: a.type,
          width: a.width,
          height: a.height,
          // Временные ID от клиента игнорируем, messageId будет обновлен позже
          messageId: undefined,
        });
        
        // Возвращаем URL для немедленного использования
        const url = await ctx.storage.getUrl(a.storageId);
        return {
          id: attachmentId,
          url,
          name: a.name,
          type: a.type,
          width: a.width,
          height: a.height,
        };
      })
    );
    return saved;
  },
});

export const byThread = query({
  args: { threadId: v.id('threads') },
  async handler(ctx, { threadId }) {
    const attachments = await ctx.db
      .query('attachments')
      .withIndex('by_thread', (q) => q.eq('threadId', threadId))
      .collect();
    
    // Получаем URL параллельно для ускорения
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (a) => {
        const url = await ctx.storage.getUrl(a.fileId);
        return {
          id: a._id,
          messageId: a.messageId,
          name: a.name,
          type: a.type,
          width: a.width,
          height: a.height,
          url,
        };
      })
    );
    
    return attachmentsWithUrls;
  },
});

// Новая mutation для обновления messageId у вложений
export const updateMessageId = mutation({
  args: {
    attachmentIds: v.array(v.id('attachments')),
    messageId: v.id('messages'),
  },
  async handler(ctx, args) {
    await Promise.all(
      args.attachmentIds.map(id =>
        ctx.db.patch(id, { messageId: args.messageId })
      )
    );
  },
});
