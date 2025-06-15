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
          // Temporary IDs come from the client as plain strings. Cast them to
          // satisfy the schema; they will be replaced with a real ID later.
          messageId: (a.messageId ?? undefined) as Id<'messages'> | undefined,
        });
        
        // Возвращаем URL для немедленного использования
        const url = await ctx.storage.getUrl(a.storageId);
        return {
          id: attachmentId,
          url,
          name: a.name,
          type: a.type,
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
    return Promise.all(
      attachments.map(async (a) => ({
        id: a._id,
        messageId: a.messageId,
        name: a.name,
        type: a.type,
        url: await ctx.storage.getUrl(a.fileId),
      }))
    );
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
