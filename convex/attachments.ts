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
        previewId: v.optional(v.string()),
        name: v.string(),
        type: v.string(),
        messageId: v.union(v.string(), v.null()),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        size: v.optional(v.number()),
      })
    ),
  },
  async handler(ctx, args) {
    const saved = await Promise.all(
      args.attachments.map(async (a) => {
        const attachmentId = await ctx.db.insert('attachments', {
          threadId: args.threadId,
          fileId: a.storageId,
          previewId: a.previewId,
          name: a.name,
          type: a.type,
          width: a.width,
          height: a.height,
          size: a.size,
          // Временные ID от клиента игнорируем, messageId будет обновлен позже
          messageId: undefined,
        });
        
        // Получаем URL для превью (если есть) иначе оригинал
        let url: string | null = null;
        if (a.previewId) {
          url = await ctx.storage.getUrl(a.previewId);
        } else if (!a.type.startsWith('image/')) {
          // For non-image files we can safely return full URL (e.g. PDFs, text),
          // since they are typically downloaded only on click.
          url = await ctx.storage.getUrl(a.storageId);
        }
        return {
          id: attachmentId,
          url,
          name: a.name,
          type: a.type,
          width: a.width,
          height: a.height,
          size: a.size,
          previewId: a.previewId,
          fileId: a.storageId,
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
        let url: string | null = null;
        if (a.previewId) {
          url = await ctx.storage.getUrl(a.previewId);
        } else if (!a.type.startsWith('image/')) {
          // For non-image files we can safely return full URL (e.g. PDFs, text),
          // since they are typically downloaded only on click.
          url = await ctx.storage.getUrl(a.fileId);
        }
        return {
          id: a._id,
          messageId: a.messageId,
          name: a.name,
          type: a.type,
          width: a.width,
          height: a.height,
          size: a.size,
          previewId: a.previewId,
          fileId: a.fileId,
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

// Return a signed URL for the *full* attachment (original file)
export const getUrl = query({
  args: { attachmentId: v.id('attachments') },
  async handler(ctx, { attachmentId }) {
    const attachment = await ctx.db.get(attachmentId);
    if (!attachment) return null;
    const url = await ctx.storage.getUrl(attachment.fileId);
    return url;
  },
});

// Return a signed URL directly by storage ID
export const getUrlByStorageId = query({
  args: { storageId: v.string() },
  async handler(ctx, { storageId }) {
    const url = await ctx.storage.getUrl(storageId);
    return url;
  },
});

// Get attachments by message ID
export const getByMessageId = query({
  args: { messageId: v.id('messages') },
  async handler(ctx, { messageId }) {
    const attachments = await ctx.db
      .query('attachments')
      .withIndex('by_message', (q) => q.eq('messageId', messageId))
      .collect();
    
    // Получаем URL параллельно для ускорения
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (a) => {
        let url: string | null = null;
        if (a.previewId) {
          url = await ctx.storage.getUrl(a.previewId);
        } else if (!a.type.startsWith('image/')) {
          // For non-image files we can safely return full URL (e.g. PDFs, text),
          // since they are typically downloaded only on click.
          url = await ctx.storage.getUrl(a.fileId);
        }
        return {
          id: a._id,
          messageId: a.messageId,
          name: a.name,
          type: a.type,
          width: a.width,
          height: a.height,
          size: a.size,
          previewId: a.previewId,
          fileId: a.fileId,
          url,
        };
      })
    );
    
    return attachmentsWithUrls;
  },
});

// Remove attachments by message ID
export const removeByMessageId = mutation({
  args: { messageId: v.id('messages') },
  async handler(ctx, { messageId }) {
    const attachments = await ctx.db
      .query('attachments')
      .withIndex('by_message', (q) => q.eq('messageId', messageId))
      .collect();
    
    // Удаляем файлы из storage и записи из БД
    await Promise.all(
      attachments.map(async (attachment) => {
        // Удаляем оригинальный файл
        await ctx.storage.delete(attachment.fileId);
        
        // Удаляем превью если есть
        if (attachment.previewId) {
          await ctx.storage.delete(attachment.previewId);
        }
        
        // Удаляем запись из БД
        await ctx.db.delete(attachment._id);
      })
    );
  },
});
