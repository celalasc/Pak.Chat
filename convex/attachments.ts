import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const save = mutation({
  args: {
    threadId: v.id('threads'),
    attachments: v.array(v.any()),
  },
  async handler(ctx, args) {
    const saved = await Promise.all(
      args.attachments.map(async (a) => {
        const fileId = await (ctx.storage as any).store(a.file);
        return ctx.db.insert('attachments', {
          threadId: args.threadId,
          fileId,
          name: a.name,
          type: a.type,
          messageId: a.messageId ?? undefined,
        });
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
