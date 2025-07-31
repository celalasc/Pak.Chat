# Frontend Architecture

## Overview

The Pak.Chat frontend is built on Next.js 15 with React 19, implementing a modern component-based architecture with optimized state management, real-time synchronization, and advanced performance features.

## Directory Structure

```
D:\Desktop\Projects\Pak.Chat\src\frontend\
├── components/               # React components organized by feature
│   ├── ui/                  # Base UI components (Radix UI + custom)
│   ├── chat-input/          # Chat input system with model selection
│   ├── chat-history/        # Thread management and navigation
│   ├── message/             # Message rendering and controls
│   ├── mobile/              # Mobile-specific optimizations
│   └── lazy/                # Lazy-loaded component wrappers
├── stores/                  # Zustand state stores (10 specialized stores)
├── hooks/                   # Custom React hooks
├── lib/                     # Frontend utility libraries
├── types/                   # TypeScript type definitions
└── worker/                  # Web Workers for syntax highlighting
```

## State Management Architecture

### Zustand Store System

The application uses 10 specialized Zustand stores for different concerns:

#### 1. AuthStore (`D:\Desktop\Projects\Pak.Chat\src\frontend\stores\AuthStore.ts`)

**Purpose**: User authentication and Firebase integration

```typescript
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

**Key Features**:
- Firebase Auth integration (`line 1-7`)
- Google OAuth sign-in support (`line 23-31`)
- Automatic token management
- Cross-tab logout synchronization (`line 42-56`)

#### 2. SettingsStore (`D:\Desktop\Projects\Pak.Chat\src\frontend\stores\SettingsStore.ts`)

**Purpose**: User preferences and configuration management

```typescript
type Settings = {
  generalFont: GeneralFont;     // Proxima Vara | System Font
  codeFont: CodeFont;           // Berkeley Mono | System Monospace Font
  theme: Theme;                 // light | dark
  hidePersonal: boolean;        // Privacy mode
  showNavBars: boolean;         // UI navigation
  showChatPreview: boolean;     // Chat preview in sidebar
  customInstructions?: CustomInstructions;
};
```

**Advanced Features**:
- **Server Sync**: Bidirectional sync with Convex (`line 104-216`)
- **LocalStorage Persistence**: Zustand persist middleware (`line 78-98`)
- **Cross-tab Synchronization**: Storage event listeners (`line 44-56`)
- **Custom Instructions**: AI behavior personalization (`line 15-21`)

#### 3. ChatStore (`D:\Desktop\Projects\Pak.Chat\src\frontend\stores\ChatStore.ts`)

**Purpose**: Chat UI state and image generation

```typescript
interface ChatStoreState {
  setInputFn: ((value: string) => void) | null;
  isImageGenerationMode: boolean;
  imageGenerationParams: ImageGenerationParams;
  setImageGenerationMode: (enabled: boolean) => void;
  setImageGenerationParams: (params: Partial<ImageGenerationParams>) => void;
}
```

**Image Generation Configuration**:
```typescript
interface ImageGenerationParams {
  quality: 'auto' | 'low' | 'medium' | 'high';
  size: 'auto' | '1024x1024' | '1024x1536' | '1536x1024';
  count: 1 | 2 | 3 | 4;
  format: 'png' | 'jpeg' | 'webp';
  compression: number; // 0-100 for jpeg/webp
}
```

#### 4. Additional Stores

| Store | File | Purpose |
|-------|------|---------|
| **APIKeyStore** | `APIKeyStore.ts` | Encrypted API key management |
| **AttachmentsStore** | `AttachmentsStore.ts` | File upload and attachment handling |
| **CustomModesStore** | `CustomModesStore.ts` | Custom AI mode management |
| **DraftStore** | `DraftStore.ts` | Auto-save message drafts |
| **ModelStore** | `ModelStore.ts` | AI model selection and configuration |
| **ModelVisibilityStore** | `ModelVisibilityStore.ts` | Model provider visibility settings |
| **QuoteStore** | `QuoteStore.ts` | Message quoting and threading |

### Store Optimization Patterns

#### Optimized Selectors (`D:\Desktop\Projects\Pak.Chat\src\frontend\hooks\useOptimizedSelectors.ts`)

```typescript
// Мемоизированные селекторы для предотвращения ненужных ререндеров
export const useImageGenerationMode = () => 
  useChatStore(useCallback((state) => state.isImageGenerationMode, []));

export const useHasRequiredKeys = () => 
  useAPIKeyStore(useCallback((state) => 
    Object.values(state.keys).some(key => key?.trim()), []));
```

**Benefits**:
- Prevents unnecessary re-renders
- Reduces component update frequency
- Improves performance with large component trees

## Component Architecture

### Component Organization

#### 1. UI System (`D:\Desktop\Projects\Pak.Chat\src\frontend\components\ui\`)

**Base Components**:
- Built on Radix UI primitives
- Tailwind CSS styling with `cva` (class-variance-authority)
- Consistent design system implementation

```typescript
// Example: Button component with variants
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
      },
    },
  }
);
```

#### 2. Chat Input System (`D:\Desktop\Projects\Pak.Chat\src\frontend\components\chat-input\`)

**Modular Architecture**:

```
chat-input/
├── ChatInput.tsx              # Main chat input component
├── components/
│   ├── TextArea/              # Text input components
│   │   ├── ChatTextArea.tsx   # Auto-resizing textarea
│   │   └── DragDropArea.tsx   # File drop zone
│   ├── ModelDropdown/         # AI model selection
│   │   ├── ChatModelDropdown.tsx
│   │   └── ReasoningEffortSelector.tsx
│   └── ActionButtons/         # Send/Stop buttons
├── hooks/                     # Chat input specific hooks
└── utils/                     # Helper functions
```

**Key Features** (`D:\Desktop\Projects\Pak.Chat\src\frontend\components\chat-input\ChatInput.tsx:1-50`):
- Auto-resizing textarea with character limits
- Drag-and-drop file upload
- Model selection with provider switching
- Image generation mode toggle
- Real-time draft saving

#### 3. Lazy Loading System (`D:\Desktop\Projects\Pak.Chat\src\frontend\components\lazy\`)

**Performance Optimization**:

```typescript
// LazyChatView.tsx - Динамическая загрузка компонентов чата
const ChatView = dynamic(() => import('../ChatView'), {
  ssr: false,
  loading: () => <ChatViewSkeleton />
});

// LazyMessages.tsx - Ленивая загрузка сообщений
const Messages = dynamic(() => import('../message/Messages'), {
  ssr: false,
  loading: () => <MessageLoading />
});
```

**Benefits**:
- Reduced initial bundle size
- Faster initial page load
- Progressive enhancement approach

### Mobile Optimization (`D:\Desktop\Projects\Pak.Chat\src\frontend\components\mobile\`)

#### PWA Features
- **Service Worker**: Offline support and caching
- **Install Prompt**: Native app installation
- **Mobile Gestures**: Touch-optimized interactions

#### Mobile Components
- **PullToRefresh**: Native-style pull to refresh
- **MobileEnhancements**: Keyboard handling and viewport optimization
- **MobileChatMenu**: Mobile-specific navigation

## Hooks Architecture

### Custom Hooks (`D:\Desktop\Projects\Pak.Chat\src\frontend\hooks\`)

#### 1. Data Fetching Hooks

**useConvexMessages** (`D:\Desktop\Projects\Pak.Chat\src\frontend\hooks\useConvexMessages.ts:7-21`):
```typescript
export function useConvexMessages(threadId: string) {
  const shouldQuery = useMemo(() => 
    isConvexId(threadId), 
    [threadId]
  );

  const messages = useQuery(
    api.messages.get,
    shouldQuery ? { threadId: threadId as Id<'threads'> } : 'skip'
  );

  return useMemo(() => messages || [], [messages]);
}
```

**Key Features**:
- Conditional querying with `skip` pattern
- Memoized results for performance
- Type-safe Convex integration

#### 2. Performance Hooks

**useOptimizedSelectors**: Memoized store selectors
**useAsyncStoreSync**: Bidirectional state synchronization
**useScrollHide**: Smart header hiding on scroll
**useKeyboardInsets**: Mobile keyboard handling

#### 3. User Interface Hooks

**useIsMobile**: Responsive design detection
**useLongPress**: Touch gesture handling
**useTextSelection**: Text selection for quoting
**useRippleEffect**: Material Design ripple effects

## Real-time Synchronization

### Convex Integration (`D:\Desktop\Projects\Pak.Chat\src\frontend\components\ConvexClientProvider.tsx`)

**Authentication Flow**:
```typescript
const authState = useMemo(
  () => ({
    isLoading: idToken === undefined || loading,
    isAuthenticated: !!idToken,
    fetchAccessToken: async ({ forceRefreshToken }) =>
      getFreshToken(forceRefreshToken),
  }),
  [idToken, loading, getFreshToken]
);
```

**Token Management** (`line 44-59`):
- Automatic token refresh
- Cached token with expiration
- Force refresh capability for API calls

### Data Synchronization Patterns

#### 1. Optimistic Updates
```typescript
// Immediate UI update followed by server sync
const sendMessage = async (content: string) => {
  // Optimistic update
  setMessages(prev => [...prev, { id: 'temp', content, role: 'user' }]);
  
  // Server sync
  const realMessage = await sendMutation({ content });
  
  // Replace optimistic with real data
  setMessages(prev => prev.map(m => 
    m.id === 'temp' ? realMessage : m
  ));
};
```

#### 2. Real-time Subscriptions
```typescript
// Automatic updates through Convex subscriptions
const messages = useQuery(api.messages.get, { threadId });
const threads = useQuery(api.threads.list, {});
```

## Performance Optimization

### Code Splitting Strategy

#### 1. Route-based Splitting
```typescript
// Dynamic imports for page components
const ChatPage = dynamic(() => import('./chat/[[...slug]]/page'));
const ProjectPage = dynamic(() => import('./project/[projectId]/page'));
```

#### 2. Component-based Splitting
```typescript
// Heavy components loaded on demand
const SettingsDrawer = dynamic(() => import('./SettingsDrawer'));
const ImageModal = dynamic(() => import('./ImageModal'));
```

### Memory Optimization

#### 1. Component Memoization
```typescript
// Chat component with React.memo
const Chat = React.memo(function Chat({ threadId, thread, initialMessages }) {
  // Component logic
});
```

#### 2. Callback Optimization
```typescript
// Memoized callbacks to prevent child re-renders
const handleSubmit = useCallback((data) => {
  // Submit logic
}, [dependencies]);
```

### Bundle Optimization

#### 1. Tree Shaking
- ES modules for optimal tree shaking
- Selective imports from large libraries
- Dead code elimination

#### 2. Dynamic Imports
```typescript
// Conditional feature loading
const loadAdvancedFeatures = async () => {
  if (userHasPremium) {
    const { AdvancedChat } = await import('./AdvancedChat');
    return AdvancedChat;
  }
};
```

## Error Handling and Resilience

### Error Boundaries

```typescript
// Global error boundary with fallback UI
class ErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error and show fallback UI
  }
}
```

### Network Resilience

#### 1. Offline Support
- Service worker caching
- IndexedDB for offline data
- Network status detection

#### 2. Retry Logic
```typescript
// Automatic retry with exponential backoff
const withRetry = async (fn: Function, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(Math.pow(2, i) * 1000);
    }
  }
};
```

## Testing Strategy

### Component Testing
- React Testing Library for component tests
- Mock service providers for isolation
- Snapshot testing for UI consistency

### Integration Testing
- End-to-end testing with Playwright
- Real-time features testing
- Cross-browser compatibility

### Performance Testing
- Lighthouse CI for performance metrics
- Bundle analyzer for size optimization
- Memory leak detection

## Accessibility Implementation

### ARIA Standards
- Proper semantic HTML
- ARIA labels and descriptions
- Keyboard navigation support

### Screen Reader Support
- Live regions for dynamic content
- Descriptive text for interactive elements
- Proper heading hierarchy

### Color and Contrast
- WCAG AA compliance
- High contrast mode support
- Color-blind friendly palette

---

*This document reflects the current frontend architecture as implemented in the Pak.Chat codebase at D:\Desktop\Projects\Pak.Chat\src\frontend\*