# Database Queries and Patterns Documentation

## Overview

This document provides comprehensive coverage of all database query patterns, CRUD operations, and optimization techniques used in Pak.Chat's Convex database implementation. All examples are from the actual codebase with complete function signatures and implementation details.

## Core Query Architecture

### Convex Query System
- **Framework**: Convex serverless database with TypeScript
- **Query Types**: Queries (read-only), Mutations (write operations)
- **Real-time**: Automatic subscription-based updates
- **Type Safety**: Full TypeScript integration with generated types

### Authentication Pattern
All queries use the standardized authentication pattern:

```typescript
// /convex/utils.ts:9-24
export async function currentUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
    .unique();

  return user?._id || null;
}
```

## User Management Queries

### User Authentication and Synchronization

#### Find User by Token
```typescript
// /convex/users.ts:5-13
export const findByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .unique();
  },
});
```

#### Create New User
```typescript
// /convex/users.ts:15-25
export const create = internalMutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    tokenIdentifier: v.string(),
  },
  handler: (ctx, args) => {
    return ctx.db.insert("users", args);
  },
});
```

#### Sync User from Firebase
```typescript
// /convex/users.ts:57-92
export const sync = mutation({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (existingUser) {
      if (
        existingUser.name !== identity.name ||
        existingUser.avatarUrl !== identity.pictureUrl
      ) {
        await ctx.db.patch(existingUser._id, {
          name: identity.name!,
          avatarUrl: identity.pictureUrl,
        });
      }
      return existingUser._id;
    } else {
      return await ctx.db.insert("users", {
        name: identity.name!,
        email: identity.email,
        avatarUrl: identity.pictureUrl,
        tokenIdentifier: identity.subject,
      });
    }
  },
});
```

**Performance Notes**:
- Uses unique index on `tokenIdentifier` for O(1) lookups
- Upsert pattern prevents duplicate user records
- Conditional updates minimize write operations

## Thread Management Queries

### Thread Listing with Search

#### Basic Thread Listing
```typescript
// /convex/threads.ts:25-47
export const list = query({
  args: { searchQuery: v.optional(v.string()) },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (uid === null) return [];

    if (args.searchQuery) {
      return ctx.db
        .query("threads")
        .withSearchIndex("by_title", (q) => q.search("title", args.searchQuery!))
        .take(20)
        .then((res) => res.filter((t) => t.userId === uid));
    }

    return ctx.db
      .query("threads")
      .withIndex("by_user_and_time", (q) => q.eq("userId", uid))
      .order("desc")
      .collect();
  },
});
```

#### Threads with Project Information
```typescript
// /convex/threads.ts:51-101
export const listWithProjects = query({
  args: { searchQuery: v.optional(v.string()) },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (uid === null) return [];

    // Get all threads for the user
    let threads: Doc<"threads">[];
    if (args.searchQuery) {
      threads = await ctx.db
        .query("threads")
        .withSearchIndex("by_title", (q) => q.search("title", args.searchQuery!))
        .take(20)
        .then((res) => res.filter((t) => t.userId === uid));
    } else {
      threads = await ctx.db
        .query("threads")
        .withIndex("by_user_and_time", (q) => q.eq("userId", uid))
        .order("desc")
        .collect();
    }

    // Get all project associations for these threads
    const threadIds = threads.map(t => t._id);
    
    let projectThreads: Doc<"projectThreads">[] = [];
    if (threadIds.length > 0) {
      projectThreads = await ctx.db
        .query("projectThreads")
        .filter((q) => q.and(
          q.eq(q.field("userId"), uid),
          q.or(...threadIds.map(id => q.eq(q.field("threadId"), id)))
        ))
        .collect();
    }

    // Create a map of threadId to projectId
    const threadToProject = new Map<Id<"threads">, Id<"projects">>();
    projectThreads.forEach(pt => {
      threadToProject.set(pt.threadId, pt.projectId);
    });

    return threads.map(thread => ({
      ...thread,
      projectId: threadToProject.get(thread._id) || undefined
    }));
  },
});
```

**Query Optimization**:
- Search uses full-text index with 20-result limit
- Conditional query execution based on search parameter
- Manual filtering for search results to maintain security
- Efficient project association via Map lookup

#### Threads by Project
```typescript
// /convex/threads.ts:105-142
export const listByProject = query({
  args: { 
    projectId: v.id("projects"),
    searchQuery: v.optional(v.string()) 
  },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (uid === null) return [];

    // Get all thread IDs associated with this project
    const projectThreads = await ctx.db
      .query("projectThreads")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const threadIds = projectThreads.map(pt => pt.threadId);
    
    // Get the actual threads
    const threads = await Promise.all(
      threadIds.map(id => ctx.db.get(id))
    );

    // Filter out nulls and ensure they belong to the current user
    let userThreads = threads.filter(t => t !== null && t.userId === uid) as Doc<"threads">[];

    // Apply search filter if provided
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      userThreads = userThreads.filter(t => 
        t.title.toLowerCase().includes(query)
      );
    }

    return userThreads.sort((a, b) => b._creationTime - a._creationTime);
  },
});
```

### Thread CRUD Operations

#### Create Thread with Project Support
```typescript
// /convex/threads.ts:203-235
export const createWithProject = mutation({
  args: { 
    title: v.string(), 
    system: v.optional(v.boolean()),
    projectId: v.optional(v.id("projects"))
  },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    
    const threadId = await ctx.db.insert("threads", {
      userId: uid,
      title: args.title,
      createdAt: Date.now(),
      pinned: false,
      system: args.system ?? false,
    });
    
    // Create project-thread association if projectId is provided
    if (args.projectId) {
      await ctx.db.insert("projectThreads", {
        userId: uid,
        projectId: args.projectId,
        threadId: threadId,
      });
    }
    
    return threadId;
  },
});
```

#### Thread Cloning with Attachment Preservation
```typescript
// /convex/threads.ts:269-331
export const clone = mutation({
  args: { threadId: v.id("threads"), title: v.string() },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Thread not found or permission denied");
      
    const newThreadId = await ctx.db.insert("threads", {
      userId: uid,
      title: args.title,
      createdAt: Date.now(),
      clonedFrom: args.threadId,
      pinned: false,
    });
    
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", args.threadId))
      .collect();

    const idMap = new Map<Id<"messages">, Id<"messages">>();

    // Clone all messages
    await Promise.all(
      messages.map(async (m) => {
        const newId = await ctx.db.insert("messages", {
          threadId: newThreadId,
          authorId: m.authorId,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
          model: (m as any).model,
          metadata: (m as any).metadata,
        });
        idMap.set(m._id, newId as Id<"messages">);
      })
    );

    // Clone all attachments
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    await Promise.all(
      attachments.map((a) =>
        ctx.db.insert("attachments", {
          threadId: newThreadId,
          fileId: a.fileId,
          name: a.name,
          type: a.type,
          messageId: a.messageId ? idMap.get(a.messageId) : undefined,
          width: a.width,
          height: a.height,
          previewId: a.previewId,
          size: a.size,
          cachedUrl: a.cachedUrl,
          cachedPreviewUrl: a.cachedPreviewUrl,
          urlExpiresAt: a.urlExpiresAt,
        })
      )
    );
    
    return newThreadId;
  },
});
```

**Advanced Features**:
- Message ID mapping for attachment relationships
- Metadata preservation for image generation data
- File storage reference copying (not duplication)
- Atomic operation with rollback on failure

## Message Queries and Operations

### Message Retrieval with Attachments

#### Complete Message Loading
```typescript
// /convex/messages.ts:9-84
export const get = query({
  args: {
    threadId: v.id("threads"),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (uid === null) return [];
    
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
        const attachments = await ctx.db
          .query("attachments")
          .withIndex("by_message", (q) => q.eq("messageId", m._id))
          .collect();
        
        const attachmentsWithUrls = await Promise.all(
          attachments.map(async (a) => {
            let url: string | null = null;
            let originalUrl: string | null = null;
            
            if (a.type.startsWith('image/')) {
              originalUrl = await ctx.storage.getUrl(a.fileId);
              if (a.previewId) {
                url = await ctx.storage.getUrl(a.previewId);
              } else {
                url = originalUrl;
              }
            } else {
              url = await ctx.storage.getUrl(a.fileId);
              originalUrl = url;
            }
            
            return {
              id: a._id,
              url,
              originalUrl,
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
          metadata: (m as any).metadata,
        };
      })
    );
    return decrypted;
  },
});
```

**Performance Optimizations**:
- Parallel attachment loading with Promise.all
- Conditional URL generation for images vs files
- Preview URL fallback for better UX
- Automatic decryption with error handling

#### Message Preview (Limited)
```typescript
// /convex/messages.ts:124-189
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
        // ... similar attachment loading logic
        return {
          ...m,
          content: await tryDecrypt(m.content),
          attachments: attachmentsWithUrls,
          metadata: (m as any).metadata,
        };
      })
    );
    return decrypted.slice(0, limit ?? 4);
  },
});
```

### Message CRUD Operations

#### Send Message with Encryption
```typescript
// /convex/messages.ts:193-221
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
```

#### Atomic Message Regeneration
```typescript
// /convex/messages.ts:278-314
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
    if (!userMessage || userMessage.threadId !== threadId || userMessage.role !== 'user') {
      throw new Error('User message not found or invalid.');
    }

    // Delete all messages after the user message
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
      metadata: (userMessage as any).metadata,
    };
  },
});
```

**Atomic Operations**:
- All related messages deleted in single transaction
- Timestamp-based range deletion for precision
- Returns decrypted user message for regeneration

## Attachment Management

### File Upload and Storage

#### Generate Upload URL
```typescript
// /convex/attachments.ts:5-7
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});
```

#### Save Attachments with Preview Support
```typescript
// /convex/attachments.ts:9-84
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
        let messageIdToSave: Id<'messages'> | undefined = undefined;
        if (a.messageId && typeof a.messageId === 'string' && a.messageId.startsWith('j')) {
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
        
        // Generate URLs for immediate use
        let url: string | null = null;
        let originalUrl: string | null = null;
        
        if (a.type.startsWith('image/')) {
          originalUrl = await ctx.storage.getUrl(a.storageId);
          if (a.previewId) {
            url = await ctx.storage.getUrl(a.previewId);
          } else {
            url = originalUrl;
          }
        } else {
          url = await ctx.storage.getUrl(a.storageId);
          originalUrl = url;
        }
        
        return {
          id: attachmentId,
          url,
          originalUrl,
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
```

### URL Caching System

#### Cached URL Retrieval
```typescript
// /convex/attachments.ts:163-194
export const getUrlByStorageId = query({
  args: { storageId: v.string() },
  async handler(ctx, { storageId }) {
    try {
      if (!storageId || storageId.length === 0) return null;
      
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
      console.error('Error getting URL for storage ID:', storageId, error);
      return null;
    }
  },
});
```

#### Update Cache
```typescript
// /convex/attachments.ts:197-218
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
```

**Caching Strategy**:
- 2-hour TTL for signed URLs
- Automatic cache invalidation on expiry
- Fallback to fresh URL generation
- Error handling for invalid storage IDs

## Project and File Management

### Project Queries

#### List Projects with Pagination
```typescript
// /convex/projects.ts:5-23
export const list = query({
  args: {
    paginationOpts: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw new Error("Не авторизован");

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);

    return projects;
  },
});
```

#### Project with Access Control
```typescript
// /convex/projects.ts:25-45
export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) return null;
    
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Проект не найден");
    if (project.userId !== userId) throw new Error("Нет доступа к проекту");
    
    return project;
  },
});
```

### Project File Operations

#### List Project Files
```typescript
// /convex/projectFiles.ts:5-34
export const list = query({
  args: {
    projectId: v.id("projects"),
    paginationOpts: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw new Error("Не авторизован");
    
    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Проект не найден");
    if (project.userId !== userId) throw new Error("Нет доступа к проекту");

    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .paginate(args.paginationOpts);

    return files;
  },
});
```

#### Create Project File
```typescript
// /convex/projectFiles.ts:36-62
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    content: v.string(),
    fileType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) throw new Error("Не авторизован");
    
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Проект не найден или нет доступа");
    }

    const fileId = await ctx.db.insert("projectFiles", {
      userId: userId,
      projectId: args.projectId,
      name: args.name,
      content: args.content,
      fileType: args.fileType,
    });
    return fileId;
  },
});
```

## Settings and Configuration

### User Settings Management

#### Get User Settings
```typescript
// /convex/userSettings.ts:8-21
export const get = query({
  args: {},
  async handler(ctx) {
    const uid = await currentUserId(ctx);
    if (uid === null) return null;
    
    return ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", uid))
      .unique();
  },
});
```

#### Save UI Preferences
```typescript
// /convex/userSettings.ts:47-95
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
```

### API Key Management

#### Encrypted API Key Storage
```typescript
// /convex/apiKeys.ts:21-50
export const getApiKeys = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return null;

    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!apiKeys) {
      return {
        google: "",
        openrouter: "",
        openai: "",
        groq: "",
      };
    }

    return {
      google: await tryDecrypt(apiKeys.google || ""),
      openrouter: await tryDecrypt(apiKeys.openrouter || ""),
      openai: await tryDecrypt(apiKeys.openai || ""),
      groq: await tryDecrypt(apiKeys.groq || ""),
    };
  },
});
```

#### Set Encrypted API Keys
```typescript
// /convex/apiKeys.ts:53-85
export const setApiKeys = mutation({
  args: {
    google: v.optional(v.string()),
    openrouter: v.optional(v.string()),
    openai: v.optional(v.string()),
    groq: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const payload = {
      google: args.google ? await encrypt(args.google) : "",
      openrouter: args.openrouter ? await encrypt(args.openrouter) : "",
      openai: args.openai ? await encrypt(args.openai) : "",
      groq: args.groq ? await encrypt(args.groq) : "",
      encryptedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("apiKeys", { userId, ...payload });
    }
  },
});
```

## Advanced Query Patterns

### Real-time Subscriptions

All queries in Convex automatically provide real-time subscriptions when used from the frontend:

```typescript
// Frontend usage example
const messages = useQuery(api.messages.get, { threadId });
// Automatically updates when messages change
```

### Pagination Patterns

```typescript
// Built-in Convex pagination
const results = await ctx.db
  .query("projects")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .order("desc")
  .paginate(paginationOpts);

// Returns: { page: Doc[], hasMore: boolean, nextCursor: string }
```

### Complex Filtering

```typescript
// Multi-condition filtering
const projectThreads = await ctx.db
  .query("projectThreads")
  .filter((q) => q.and(
    q.eq(q.field("userId"), uid),
    q.or(...threadIds.map(id => q.eq(q.field("threadId"), id)))
  ))
  .collect();
```

### Batch Operations

```typescript
// Parallel execution for performance
await Promise.all([
  ctx.db.delete(message1._id),
  ctx.db.delete(message2._id),
  ctx.db.delete(message3._id),
]);
```

## Performance Optimization Techniques

### Index Utilization

1. **User Isolation**: All queries use `by_user` indexes
2. **Time Ordering**: Chronological data uses composite time indexes
3. **Relationship Queries**: Foreign keys have dedicated indexes
4. **Search Operations**: Full-text search indexes for content discovery

### Query Optimization Strategies

1. **Selective Loading**: Only load required fields
2. **Parallel Execution**: Use Promise.all for independent operations
3. **Caching**: Store computed values with TTL
4. **Pagination**: Limit result sets for large collections
5. **Conditional Queries**: Skip unnecessary database calls

### Error Handling Patterns

```typescript
// Graceful degradation
if (uid === null) return [];

// Permission validation
if (!thread || thread.userId !== uid) {
  throw new Error("Permission denied");
}

// Null safety
const threads = results.filter(t => t !== null) as Doc<"threads">[];
```

## Security Best Practices

### Authentication Verification
- Every query/mutation validates user authentication
- Token-based user lookup with unique indexes
- Permission checks before data access

### Data Encryption
- Sensitive content encrypted before storage
- Automatic decryption with fallback handling
- Individual field encryption for API keys

### Access Control
- Resource ownership validation
- Cross-user access only for public shares
- Input validation and sanitization

This comprehensive query documentation provides complete coverage of all database operations, optimization techniques, and security patterns used in the Pak.Chat application, with actual code examples and implementation details from the live codebase.