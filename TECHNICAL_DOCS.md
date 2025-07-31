# Pak.Chat Technical Documentation

## Project Overview

Pak.Chat is a sophisticated Next.js-based AI chat application designed for high-performance interactions with multiple Large Language Model providers. The application features real-time chat capabilities, message threading, quoting, branching, and comprehensive project management with file support. It combines modern web technologies with mobile-first design principles to deliver a seamless cross-platform experience.

## Architecture Overview and System Design

### High-Level Architecture

The application follows a **modern full-stack architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15.3.2)               │
├─────────────────────────────────────────────────────────────┤
│  • React 19.1.0 + TypeScript                               │
│  • Zustand State Management                                │
│  • Tailwind CSS + Framer Motion                           │
│  • PWA Support (Service Worker)                           │
└─────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                         │
├─────────────────────────────────────────────────────────────┤
│  • Convex Database (Real-time)                            │
│  • Firebase Authentication                                │
│  • Cloudflare Workers (Edge Functions)                    │
│  • File Storage (Convex Storage)                          │
└─────────────────────────────────────────────────────────────┘
                                │
                                │ API Calls
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Providers                             │
├─────────────────────────────────────────────────────────────┤
│  • OpenAI (GPT-4o, o3, o4-mini)                           │
│  • Google (Gemini 2.5 Pro/Flash)                          │
│  • Groq (Llama, Qwen models)                              │
│  • OpenRouter (DeepSeek R1, V3)                           │
└─────────────────────────────────────────────────────────────┘
```

### Core Technology Stack

**Frontend Technologies:**
- **Next.js 15.3.2** with React 19.1.0 - App Router, Turbopack, Server Actions
- **TypeScript 5.8.3** - Full type safety across the application
- **Tailwind CSS 4.1.8** - Utility-first styling with custom design system
- **Zustand 5.0.5** - Lightweight state management
- **AI SDK 4.3.16** - Streaming chat interface and provider abstraction

**Backend & Database:**
- **Convex 1.24.8** - Real-time database with TypeScript schema
- **Firebase 11.9.1** - Authentication and user management
- **Cloudflare Workers** - Edge computing for optimized performance

**Mobile & PWA:**
- **Next-PWA 5.6.0** - Progressive Web App capabilities
- **Custom viewport handling** - Mobile-optimized UI adaptations
- **Service Worker** - Offline support and caching strategies

## Component Structure and Organization

### Frontend Architecture (`/src/frontend/`)

The frontend follows a **feature-based architecture** with clear separation of concerns:

#### Core Components (`/components/`)

**Main UI Components:**
```typescript
// /src/frontend/components/Chat.tsx:33-59
const Chat = React.memo(function Chat({ 
  threadId, 
  thread, 
  initialMessages, 
  projectId, 
  project, 
  customLayout, 
  onThreadCreated 
}: ChatProps) {
  // Handles main chat container, navigation, and responsive layout
}
```

**Chat Input System (`/components/chat-input/`):**
```typescript
// /src/frontend/components/chat-input/ChatInput.tsx:51-65
function PureChatInput({
  threadId, thread, input, status, error,
  setInput, reload, setMessages, append, stop,
  messageCount, onThreadCreated, projectId,
}: ChatInputProps) {
  // Manages text input, attachments, model selection, and submission
}
```

**Message Management (`/components/message/`):**
```typescript
// /src/frontend/components/message/Messages.tsx:10-34
function PureMessages({
  threadId, messages, status, setMessages,
  reload, append, error, stop,
  forceRegeneration, isRegenerating,
  isFirstMessagePending,
}: MessagesProps) {
  // Renders message list with streaming support and regeneration
}
```

#### State Management (`/stores/`)

**Chat State Management:**
```typescript
// /src/frontend/stores/ChatStore.ts:11-22
interface ChatStoreState {
  setInputFn: ((value: string) => void) | null;
  isImageGenerationMode: boolean;
  imageGenerationParams: ImageGenerationParams;
  setImageGenerationMode: (enabled: boolean) => void;
  setImageGenerationParams: (params: Partial<ImageGenerationParams>) => void;
}
```

**Authentication Store:**
```typescript
// /src/frontend/stores/AuthStore.ts:8-18
interface AuthState {
  user: User | null;
  loading: boolean;
  redirecting: boolean;
  blurPersonalData: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  init: () => () => void;
}
```

### Mobile Optimizations (`/components/mobile/`)

**Mobile Enhancements:**
```typescript
// /src/frontend/components/mobile/MobileEnhancements.tsx:6-40
export default function MobileEnhancements() {
  // Custom viewport height handling
  // Virtual keyboard detection
  // Orientation change management
  // PWA app mode detection
}
```

## Key Features and Functionality

### 1. Multi-Provider AI Support

**Model Configuration System:**
```typescript
// /src/lib/models.ts:31-115
export const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  'Deepseek R1 0528': { modelId: 'deepseek/deepseek-r1-0528:free', provider: 'openrouter', company: 'DeepSeek' },
  'Gemini 2.5 Pro': { modelId: 'gemini-2.5-pro', provider: 'google', company: 'Google' },
  'GPT-4o': { modelId: 'gpt-4o', provider: 'openai', company: 'OpenAI' },
  'o3': { modelId: 'o3', provider: 'openai', company: 'OpenAI', reasoningEffort: 'medium' },
  // ... additional models
}
```

**Supported Providers:**
- **OpenAI** - GPT-4o, GPT-4.1 series, o3/o4-mini (reasoning models)
- **Google** - Gemini 2.5 Pro/Flash with Search Grounding support
- **Groq** - Meta Llama 4, Qwen, DeepSeek models
- **OpenRouter** - DeepSeek R1, V3 models

### 2. Real-time Chat with Advanced Features

**Message Threading and Branching:**
```typescript
// /convex/threads.ts:186-200
export const create = mutation({
  args: { title: v.string(), system: v.optional(v.boolean()) },
  async handler(ctx, args) {
    return ctx.db.insert("threads", {
      userId: uid,
      title: args.title,
      createdAt: Date.now(),
      pinned: false,
      system: args.system ?? false,
    });
  },
});
```

**Message Quoting and Regeneration:**
```typescript
// /convex/messages.ts:277-314
export const prepareForRegeneration = mutation({
  args: { threadId: v.id('threads'), userMessageId: v.id('messages') },
  async handler(ctx, { threadId, userMessageId }) {
    // Atomically removes messages after the specified user message
    // Enables clean regeneration of AI responses
  },
});
```

### 3. File Upload and Attachment System

**Multi-format Support:**
- **Images** - Direct display with preview generation
- **PDFs** - Text extraction for non-Google models, native support for Gemini
- **Text files** - JSON, CSV, YAML, SQL, and structured data
- **Binary files** - Base64 encoding for AI analysis

**Attachment Processing:**
```typescript
// /src/app/api/llm/route.ts:244-321
// Processes multiple file types with size limits (30MB)
// Generates previews for images
// Extracts text from PDFs using pdf-parse
// Handles MIME type detection and conversion
```

### 4. Project Management System

**Project Structure:**
```typescript
// /convex/schema.ts:136-161
projects: defineTable({
  userId: v.id("users"),
  name: v.string(),
  customInstructions: v.optional(v.string()),
  isPublic: v.boolean(),
}).index("by_user", ["userId"]),

projectFiles: defineTable({
  userId: v.id("users"),
  projectId: v.id("projects"),
  name: v.string(),
  content: v.string(),
  fileType: v.string(),
}).index("by_project", ["projectId"]),
```

### 5. Image Generation Integration

**OpenAI DALL-E Integration:**
```typescript
// /src/frontend/stores/ChatStore.ts:3-9
interface ImageGenerationParams {
  quality: 'auto' | 'low' | 'medium' | 'high';
  size: 'auto' | '1024x1024' | '1024x1536' | '1536x1024';
  count: 1 | 2 | 3 | 4;
  format: 'png' | 'jpeg' | 'webp';
  compression: number; // 0-100 for jpeg/webp
}
```

## API Endpoints and Data Flow

### Core API Routes (`/src/app/api/`)

**Main LLM Endpoint:**
```typescript
// /src/app/api/llm/route.ts:47-459
export async function POST(req: NextRequest) {
  // Handles streaming chat with multiple providers
  // Processes attachments and project context
  // Manages encryption and user settings
  // Supports image generation mode
}
```

**Image Generation Endpoint:**
```typescript
// /src/app/api/image-generation/route.ts
// Dedicated endpoint for DALL-E image generation
// Handles multiple image formats and compression
// Integrates with Convex storage for persistence
```

**File Serving:**
```typescript
// /src/app/api/files/[storageId]/route.ts
// Secure file serving with authentication
// Supports range requests for large files
// Implements caching and CDN optimization
```

### Data Flow Architecture

**Request Flow:**
```
User Input → ChatInput → API Route → AI Provider → Streaming Response → UI Update
     ↓
Convex Database ← Message Storage ← Response Processing ← Stream Handling
```

**Authentication Flow:**
```
Firebase Auth → JWT Token → Convex Verification → User Session → Database Access
```

## State Management Patterns

### Zustand Store Architecture

**Global State Stores:**
- `AuthStore` - User authentication and session management
- `ChatStore` - Chat input and image generation state
- `ModelStore` - AI model selection and configuration
- `SettingsStore` - User preferences and custom instructions
- `AttachmentsStore` - File upload and attachment management
- `QuoteStore` - Message quoting and reference system

**Store Synchronization:**
```typescript
// /src/frontend/stores/ModelStore.ts:111-175
export function useModelSync() {
  // Bidirectional sync between local Zustand store and Convex database
  // Handles conflict resolution and initialization
  // Maintains consistency across browser tabs
}
```

### Real-time Data Synchronization

**Convex Integration:**
```typescript
// /src/frontend/hooks/useConvexMessages.ts
// Real-time message updates using Convex subscriptions
// Automatic re-fetching on connection restore
// Optimistic updates for improved UX
```

## Authentication and Security

### Firebase Authentication

**Configuration:**
```typescript
// /src/firebase/config.ts:1-8
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
```

**Security Features:**
- **Google OAuth** - Single sign-on authentication
- **JWT Tokens** - Secure session management
- **CORS Policies** - Cross-origin request protection
- **Content Security Policy** - XSS prevention headers

### Data Encryption

**Message Encryption:**
```typescript
// /convex/encryption.ts
// AES-256 encryption for message content
// Secure key derivation and storage
// Transparent encryption/decryption in database operations
```

**API Key Management:**
```typescript
// /convex/apiKeys.ts
// Encrypted storage of user API keys
// Per-user key isolation
// Secure key retrieval for AI provider requests
```

## Database Schema and Data Models

### Convex Schema Overview

**Core Tables:**
```typescript
// /convex/schema.ts:5-162
export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),
  
  threads: defineTable({
    userId: v.id("users"),
    title: v.string(),
    system: v.optional(v.boolean()),
    createdAt: v.number(),
    pinned: v.optional(v.boolean()),
    clonedFrom: v.optional(v.id("threads")),
    forkedFromMessageId: v.optional(v.id("messages")),
    draft: v.optional(v.string()),
  }).index("by_user_and_time", ["userId", "createdAt"]),
  
  messages: defineTable({
    threadId: v.id("threads"),
    authorId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(), // Encrypted
    createdAt: v.number(),
    model: v.optional(v.string()),
    metadata: v.optional(v.any()),
  }).index("by_thread_and_time", ["threadId", "createdAt"]),
});
```

**Advanced Features:**
- **Full-text Search** - Thread title search with indexing
- **File Attachments** - Linked to messages with preview support
- **Project Association** - Many-to-many relationship between threads and projects
- **Public Sharing** - Shareable thread links with privacy controls

### Data Relationships

```
Users (1) ←→ (∞) Threads ←→ (∞) Messages
  ↓                ↓               ↓
UserSettings   ProjectThreads  Attachments
  ↓                ↓
ModelVisibility  Projects ←→ ProjectFiles
```

## Development and Deployment Workflows

### Development Environment

**Package Manager:**
```json
// package.json:5
"packageManager": "pnpm@9.0.0"
```

**Development Scripts:**
```json
// package.json:6-14
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
  "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
}
```

### Build Configuration

**Next.js Optimization:**
```typescript
// next.config.ts:51-236
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    serverActions: { bodySizeLimit: '10mb' },
  },
  
  webpack: (config, { dev, isServer }) => {
    // Bundle splitting for vendors, Convex, and UI components
    // Mobile-specific optimizations
    // Alias configuration for path resolution
  },
  
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
};
```

### PWA Configuration

**Service Worker Setup:**
```typescript
// next.config.ts:7-48
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  sw: 'sw.js',
  register: false,
  skipWaiting: true,
  fallbacks: { document: '/offline' },
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.convex\.cloud\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
  ],
});
```

**Manifest Configuration:**
```json
// public/manifest.webmanifest:1-39
{
  "name": "Pak.Chat",
  "short_name": "Pak.Chat",
  "start_url": "/chat",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#000000",
  "categories": ["productivity", "social"],
  "description": "High-Performance LLM Application"
}
```

## Performance Optimizations and Best Practices

### Frontend Optimizations

**React Performance:**
```typescript
// /src/frontend/components/message/Messages.tsx:68-76
const MemoizedMessages = memo(PureMessages, (prevProps, nextProps) => {
  return (
    equal(prevProps.messages, nextProps.messages) &&
    prevProps.status === nextProps.status &&
    prevProps.error === nextProps.error &&
    prevProps.isRegenerating === nextProps.isRegenerating
  );
});
```

**Lazy Loading:**
```typescript
// /src/frontend/components/lazy/
// Lazy-loaded components for chat input and message rendering
// Reduces initial bundle size and improves load times
```

**Mobile Optimizations:**
```typescript
// /src/frontend/components/mobile/MobileEnhancements.tsx:12-30
// Custom viewport height calculation for mobile browsers
// Virtual keyboard detection and UI adjustments
// Orientation change handling
```

### Backend Optimizations

**Database Indexing:**
```typescript
// /convex/schema.ts:75-76
.index("by_user_and_time", ["userId", "createdAt"])
.searchIndex("by_title", { searchField: "title" })
```

**Caching Strategies:**
```typescript
// /convex/attachments.ts
// URL caching with TTL for file attachments
// Preview generation and storage optimization
// Size-based lazy loading decisions
```

### Bundle Optimization

**Code Splitting:**
```typescript
// next.config.ts:97-120
config.optimization.splitChunks = {
  chunks: 'all',
  cacheGroups: {
    vendor: { test: /[\\/]node_modules[\\/]/, name: 'vendors' },
    convex: { test: /[\\/]node_modules[\\/]convex[\\/]/, name: 'convex', priority: 10 },
    ui: { test: /[\\/]src[\\/]components[\\/]ui[\\/]/, name: 'ui', priority: 5 },
  },
};
```

## Troubleshooting and Common Issues

### Development Issues

**Convex Connection Problems:**
```bash
# Reset Convex development environment
npx convex dev --reset

# Check deployment status
npx convex dashboard
```

**Firebase Authentication Errors:**
```typescript
// Verify environment variables are properly set
console.log('Firebase Config:', {
  apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
```

**Build Optimization Issues:**
```bash
# Analyze bundle size
npx @next/bundle-analyzer

# Check for circular dependencies
npm run build 2>&1 | grep -i circular
```

### Production Monitoring

**Performance Metrics:**
- Core Web Vitals monitoring via Vercel Analytics
- Real User Monitoring (RUM) for mobile performance
- API response time tracking through Convex dashboard

**Error Tracking:**
- Client-side error boundaries for graceful degradation
- Server-side error logging through Convex functions
- Network failure handling with retry mechanisms

This comprehensive technical documentation provides a complete overview of the Pak.Chat application architecture, implementation details, and best practices for development and deployment.