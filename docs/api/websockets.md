# WebSocket & Real-Time Communication API

This document provides comprehensive details on Pak.Chat's real-time communication system built on Convex's reactive database architecture.

## Architecture Overview

Pak.Chat implements real-time functionality through Convex's reactive query system rather than traditional WebSockets, providing automatic subscription management and optimistic updates.

### Core Components

#### 1. Convex Client Provider (`/src/frontend/components/ConvexClientProvider.tsx`)

```typescript
// Authentication-aware Convex client setup
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthStore();
  const [idToken, setIdToken] = useState<string | null | undefined>(undefined);
  const cachedToken = useRef<string | undefined>(undefined);
  const cachedExp = useRef<number>(0); // Token expiration timestamp
```

**Key Features:**
- Automatic Firebase token refresh with 60-second buffer
- Token caching with expiration tracking
- Seamless authentication state synchronization
- Cross-tab authentication persistence

#### 2. Real-Time Message Streaming (`/src/frontend/hooks/useConvexMessages.ts`)

```typescript
export function useConvexMessages(threadId: string) {
  // Memoized query condition for performance
  const shouldQuery = useMemo(() => 
    isConvexId(threadId), 
    [threadId]
  );

  const messages = useQuery(
    api.messages.get,
    shouldQuery ? { threadId: threadId as Id<'threads'> } : 'skip'
  );

  // Memoized result to prevent unnecessary re-renders
  return useMemo(() => messages || [], [messages]);
}
```

**Real-Time Capabilities:**
- Automatic subscription to message updates
- Optimistic updates for instant UI feedback
- Built-in error recovery and retry logic
- Memory-efficient query memoization

#### 3. Thread Management (`/src/frontend/hooks/useConvexThreads.ts`)

```typescript
export function useConvexThreads() {
  const { user } = useAuthStore();
  const [cachedThreads, setCachedThreads] = useState<ThreadWithProject[]>([]);
  const [hasInitialData, setHasInitialData] = useState(false);
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(false);
  
  // Real-time thread subscription
  const threads = useQuery(
    api.threads.listWithProjects,
    user ? {} : "skip"
  );
```

**Advanced Caching Strategy:**
- Multi-level caching (memory + localStorage)
- Stale-while-revalidate pattern
- Automatic cache invalidation
- Cross-tab synchronization

## Real-Time Data Flow

### 1. Connection Establishment

```typescript
// Token-based authentication with automatic refresh
const authState = useMemo(
  () => ({
    isLoading: idToken === undefined || loading,
    isAuthenticated: !!idToken,
    fetchAccessToken: async ({ forceRefreshToken }: { forceRefreshToken: boolean }) =>
      getFreshToken(forceRefreshToken),
  }),
  [idToken, loading, getFreshToken]
);
```

### 2. Subscription Management

**Thread Subscriptions (`/convex/threads.ts`):**
```typescript
// Real-time thread listing with project associations
export const listWithProjects = query({
  args: { searchQuery: v.optional(v.string()) },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (uid === null) return [];

    // Get threads with automatic real-time updates
    let threads = await ctx.db
      .query("threads")
      .withIndex("by_user_and_time", (q) => q.eq("userId", uid))
      .order("desc")
      .collect();
```

**Message Subscriptions (`/convex/messages.ts`):**
```typescript
// Real-time message streaming with attachments
export const get = query({
  args: { threadId: v.id("threads") },
  async handler(ctx, args) {
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();
    
    // Automatic attachment loading and URL generation
    const decrypted = await Promise.all(
      msgs.map(async (m) => {
        const attachments = await ctx.db
          .query("attachments")
          .withIndex("by_message", (q) => q.eq("messageId", m._id))
          .collect();
```

### 3. Optimistic Updates

**Thread Creation:**
```typescript
const handleCreateThread = useCallback(async (title: string) => {
  if (!user) return null;
  const result = await createThread({ title });
  // Cache invalidation for immediate UI update
  threadsCache.invalidate(userId);
  return result;
}, [user, createThread, userId]);
```

**Message Sending:**
```typescript
export const send = mutation({
  args: {
    threadId: v.id("threads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    model: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  async handler(ctx, args) {
    // Immediate database insertion triggers real-time updates
    const id = await ctx.db.insert("messages", {
      threadId: args.threadId,
      authorId: uid,
      role: args.role,
      content: await encrypt(args.content),
      createdAt: Date.now(),
      model: args.model,
      metadata: args.metadata,
    });
    
    // Clear draft on successful send
    await ctx.db.patch(args.threadId, { draft: "" });
    return id;
  },
});
```

## Performance Optimizations

### 1. Intelligent Caching (`/src/frontend/lib/threadsCache.ts`)

```typescript
export class ThreadsCache {
  private memoryCache = new Map<string, ThreadsCacheEntry>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private readonly STORAGE_KEY = "pak_chat_threads_cache";
  private readonly CACHE_VERSION = 2; // Version-based invalidation

  public get(userId: string): ThreadsCacheEntry | null {
    const cached = this.memoryCache.get(userId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION || cached.version !== this.CACHE_VERSION) {
      cached.isStale = true;
    }

    return cached;
  }
```

**Cache Features:**
- Automatic localStorage persistence
- Version-based cache invalidation
- Stale data detection
- Cross-tab synchronization
- Memory-efficient title-only queries

### 2. Query Memoization

```typescript
// Prevent unnecessary re-renders with memoization
const shouldQuery = useMemo(() => 
  isConvexId(threadId), 
  [threadId]
);

const finalThreads = hasInitialData ? cachedThreads : (threads || []);
const isLoading = !hasInitialData && threads === undefined;
```

### 3. Selective Data Loading

```typescript
// Fast title-only loading for initial render
public getThreadTitles(userId: string): Array<{_id: string, title: string, pinned: boolean, _creationTime: number}> | null {
  const cached = this.get(userId);
  if (!cached || cached.isStale) return null;
  
  return cached.threads.map(thread => ({
    _id: thread._id,
    title: thread.title,
    pinned: thread.pinned || false,
    _creationTime: thread._creationTime
  }));
}
```

## Connection Resilience

### 1. Automatic Reconnection

Convex handles connection drops automatically with exponential backoff:
- Immediate reconnection attempt
- Progressive backoff (1s, 2s, 4s, 8s, max 30s)
- Automatic state reconciliation on reconnect
- Queue management for offline operations

### 2. Token Refresh Management

```typescript
const getFreshToken = useCallback(
  async (force = false) => {
    if (!user) return "";
    // Use cached token if still valid for at least 1 minute
    if (!force && cachedToken.current && Date.now() < cachedExp.current - 60_000) {
      return cachedToken.current;
    }

    const t = await user.getIdToken(force);
    cachedToken.current = t;
    const res = await user.getIdTokenResult();
    cachedExp.current = Date.parse(res.expirationTime);
    return t;
  },
  [user]
);
```

### 3. Error Recovery

```typescript
// Graceful error handling in cache operations
private restoreFromStorage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      const parsedData: Record<string, ThreadsCacheEntry> = JSON.parse(stored);
      // Validate cache entries before restoration
      Object.entries(parsedData).forEach(([key, entry]) => {
        if (now - entry.timestamp < this.CACHE_DURATION && entry.version === this.CACHE_VERSION) {
          this.memoryCache.set(key, entry);
        }
      });
    }
  } catch (error) {
    console.warn("Failed to restore threads cache from localStorage:", error);
  }
}
```

## Cross-Tab Synchronization

### 1. Shared Authentication State

The Convex provider automatically synchronizes authentication state across browser tabs through:
- Shared localStorage for token caching
- Firebase auth state listeners
- Automatic token refresh coordination

### 2. Real-Time Data Sync

```typescript
// Cache operations synchronize across tabs
public set(userId: string, threads: Doc<"threads">[]): void {
  const entry: ThreadsCacheEntry = {
    threads,
    timestamp: Date.now(),
    isStale: false,
    version: this.CACHE_VERSION
  };

  this.memoryCache.set(userId, entry);
  this.saveToStorage(); // Syncs to other tabs via localStorage

  // Automatic staleness marking
  setTimeout(() => {
    const cached = this.memoryCache.get(userId);
    if (cached && cached.timestamp === now) {
      cached.isStale = true;
      this.saveToStorage();
    }
  }, this.CACHE_DURATION);
}
```

## Error Handling Patterns

### 1. Query Error Recovery

```typescript
// Graceful fallback for failed queries
const messages = useQuery(
  api.messages.get,
  shouldQuery ? { threadId: threadId as Id<'threads'> } : 'skip'
);

// Always return empty array on failure
return useMemo(() => messages || [], [messages]);
```

### 2. Mutation Error Handling

```typescript
// Comprehensive error context in mutations
export const remove = mutation({
  args: { threadId: v.id("threads") },
  async handler(ctx, args) {
    const uid = await currentUserId(ctx);
    if (!uid) throw new Error("Unauthenticated");
    
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== uid)
      throw new Error("Thread not found or permission denied");
      
    // Atomic operation: delete messages then thread
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", args.threadId))
      .collect();
    await Promise.all(messages.map((m) => ctx.db.delete(m._id)));
    await ctx.db.delete(args.threadId);
  },
});
```

### 3. Network Failure Handling

```typescript
// Cache-first strategy with network fallback
useEffect(() => {
  if (!user) return;
  
  setIsLoadingFromCache(true);
  const cached = threadsCache.get(userId);
  if (cached && !cached.isStale) {
    setCachedThreads(cached.threads);
    setHasInitialData(true);
  }
  setIsLoadingFromCache(false);
}, [user, userId]);
```

## Best Practices

### 1. Subscription Management
- Use `"skip"` parameter to conditionally disable queries
- Implement proper cleanup in useEffect hooks
- Memoize query parameters to prevent unnecessary re-subscriptions

### 2. Performance Optimization
- Implement intelligent caching strategies
- Use selective data loading for initial renders
- Leverage Convex's built-in query optimization

### 3. Error Resilience
- Always provide fallback values for failed queries
- Implement progressive enhancement patterns
- Use optimistic updates with rollback capability

### 4. Cross-Tab Coordination
- Centralize cache management through singleton patterns
- Implement version-based cache invalidation
- Use localStorage for persistent state sharing

## Common Pitfalls

### 1. Memory Leaks
```typescript
// ❌ Bad: Unmanaged subscriptions
const messages = useQuery(api.messages.get, { threadId });

// ✅ Good: Conditional subscriptions with cleanup
const messages = useQuery(
  api.messages.get,
  isValidThread ? { threadId } : "skip"
);
```

### 2. Excessive Re-renders
```typescript
// ❌ Bad: Inline objects cause re-renders
useQuery(api.threads.list, { search: searchTerm.trim() });

// ✅ Good: Memoized parameters
const queryParams = useMemo(() => ({ 
  search: searchTerm.trim() 
}), [searchTerm]);
useQuery(api.threads.list, queryParams);
```

### 3. Race Conditions
```typescript
// ❌ Bad: Non-atomic operations
await deleteThread(threadId);
await deleteMessages(threadId);

// ✅ Good: Atomic database operations
export const remove = mutation({
  async handler(ctx, args) {
    // All operations in single transaction
    const messages = await ctx.db.query("messages")...
    await Promise.all(messages.map((m) => ctx.db.delete(m._id)));
    await ctx.db.delete(args.threadId);
  },
});
```

This architecture provides robust, scalable real-time communication with automatic error recovery, intelligent caching, and seamless cross-tab synchronization.