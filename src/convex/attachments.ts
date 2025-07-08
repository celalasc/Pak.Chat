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
        messageId: v.union(v.string(), v.null(), v.id('messages')),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        size: v.optional(v.number()),
      })
    ),
  },
  async handler(ctx, args) {
    const saved = await Promise.all(
      args.attachments.map(async (a) => {
        // Определяем messageId для сохранения
        let messageIdToSave: Id<'messages'> | undefined = undefined;
        if (a.messageId && typeof a.messageId === 'string' && a.messageId.startsWith('j')) {
          // Это валидный Convex ID
          messageIdToSave = a.messageId as Id<'messages'>;
        }
        
        const attachmentId = await ctx.db.insert('attachments', {
          threadId: args.threadId,
          fileId: a.storageId,
          previewId: a.previewId,
          name: a.name,
          type: a.type,
          width: a.width,
          height: a.height,
          size: a.size,
          messageId: messageIdToSave,
        });
        
        // Get URLs for both preview and original
        let url: string | null = null;
        let originalUrl: string | null = null;
        
        if (a.type.startsWith('image/')) {
          // Always get original URL for images
          originalUrl = await ctx.storage.getUrl(a.storageId);
          
          // Use preview for small thumbnails if available
          if (a.previewId) {
            url = await ctx.storage.getUrl(a.previewId);
          } else {
            url = originalUrl; // Fallback to original if no preview
          }
        } else {
          // For non-image files, always use original
          url = await ctx.storage.getUrl(a.storageId);
          originalUrl = url;
        }
        
        return {
          id: attachmentId,
          url,
          originalUrl, // Add original URL for high-quality viewing
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
          messageId: a.messageId,
          name: a.name,
          type: a.type,
          width: a.width,
          height: a.height,
          size: a.size,
          previewId: a.previewId,
          fileId: a.fileId,
          url,
          originalUrl, // Add original URL for high-quality viewing
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

// Return a signed URL directly by storage ID with caching
export const getUrlByStorageId = query({
  args: { storageId: v.string() },
  async handler(ctx, { storageId }) {
    try {
      // Validate storage ID format (should be a valid Convex storage ID)
      if (!storageId || storageId.length === 0) {
        return null;
      }
      
      // Try to find cached URL first
      const attachment = await ctx.db
        .query('attachments')
        .filter((q) => q.eq(q.field('fileId'), storageId))
        .first();
      
      const now = Date.now();
      
      // Return cached URL if it exists and hasn't expired
      if (attachment?.cachedUrl && attachment.urlExpiresAt && attachment.urlExpiresAt > now) {
        return attachment.cachedUrl;
      }
      
      // Generate new URL (caching will be handled by mutation)
      const url = await ctx.storage.getUrl(storageId);
      return url;
    } catch (error) {
      // Handle invalid storage ID gracefully
      console.error('Error getting URL for storage ID:', storageId, error);
      return null;
    }
  },
});

// Update cached URL for an attachment (called by client when needed)
export const updateCachedUrl = mutation({
  args: { 
    storageId: v.string(),
    url: v.string(),
  },
  async handler(ctx, { storageId, url }) {
    const attachment = await ctx.db
      .query('attachments')
      .filter((q) => q.eq(q.field('fileId'), storageId))
      .first();
    
    if (attachment) {
      const now = Date.now();
      const urlTtlMs = 2 * 60 * 60 * 1000; // 2 hours TTL
      
      await ctx.db.patch(attachment._id, {
        cachedUrl: url,
        urlExpiresAt: now + urlTtlMs,
      });
    }
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
          messageId: a.messageId,
          name: a.name,
          type: a.type,
          width: a.width,
          height: a.height,
          size: a.size,
          previewId: a.previewId,
          fileId: a.fileId,
          url,
          originalUrl, // Add original URL for high-quality viewing
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
