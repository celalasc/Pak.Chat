# Mobile Components Documentation

## Overview

Pak.Chat implements a comprehensive mobile-first design system with native app-like behavior, optimized touch interactions, PWA capabilities, and adaptive UI patterns. The mobile components are designed to provide a seamless experience across iOS and Android devices while maintaining performance and accessibility standards.

## Mobile-First Responsive Design Patterns

### Core Mobile Hook

**File**: `/src/frontend/hooks/useIsMobile.ts`

#### Responsive Breakpoint Detection
```typescript
export function useIsMobile(breakpoint: number = 768) {
  const [state, setState] = useState(() => {
    // SSR-safe initialization
    if (typeof window === 'undefined') {
      return { isMobile: false, mounted: false };
    }
    
    // Immediate client-side detection
    const isMobileDevice = window.innerWidth < breakpoint;
    return {
      isMobile: isMobileDevice,
      mounted: true
    };
  });

  // Optimized resize handling with throttling
  const checkMobile = useCallback(() => {
    const isMobileDevice = window.innerWidth < breakpoint;
    setState((prev) => {
      if (prev.isMobile !== isMobileDevice) {
        return { ...prev, isMobile: isMobileDevice };
      }
      return prev;
    });
  }, [breakpoint]);

  useLayoutEffect(() => {
    let ticking = false;
    
    const throttledCheckMobile = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          checkMobile();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('resize', throttledCheckMobile, { passive: true });
    return () => window.removeEventListener('resize', throttledCheckMobile);
  }, [checkMobile]);

  return useMemo(() => state, [state.isMobile, state.mounted]);
}
```

#### Hydration-Safe Implementation
The hook prevents hydration mismatches by:
- Server-side returning non-mobile state
- Client-side immediate detection on mount
- Proper state synchronization during hydration

### Mobile Enhancement System

**File**: `/src/frontend/components/mobile/MobileEnhancements.tsx`

#### Viewport and Keyboard Management
```typescript
export default function MobileEnhancements() {
  const { isMobile } = useIsMobile();

  useEffect(() => {
    if (!isMobile) return;

    // Custom viewport height for accurate mobile viewport
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Virtual keyboard detection
    const handleResize = () => {
      setViewportHeight();
      
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const isKeyboardOpen = viewportHeight < window.innerHeight * 0.75;
      
      document.documentElement.style.setProperty(
        '--keyboard-open', 
        isKeyboardOpen ? '1' : '0'
      );
    };

    // Orientation change handling with delay for viewport settling
    const handleOrientationChange = () => {
      setTimeout(() => {
        setViewportHeight();
      }, 100);
    };

    // Event listeners setup
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    // Mobile app classes for styling
    document.documentElement.classList.add('mobile-app');
    if (window.matchMedia('(display-mode: standalone)').matches) {
      document.documentElement.classList.add('standalone-app');
    }

    setViewportHeight(); // Initial setup

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }

      document.documentElement.classList.remove('mobile-app', 'standalone-app');
    };
  }, [isMobile]);

  return null; // Invisible enhancement component
}
```

#### CSS Custom Properties Integration
The component sets dynamic CSS properties that are used throughout the application:

```css
/* Mobile viewport height handling */
body {
  min-height: 100vh;
  min-height: 100dvh; /* Dynamic viewport height for modern browsers */
}

.mobile-fullscreen {
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
}

/* Virtual keyboard compensation */
.mobile-keyboard-fix {
  padding-bottom: calc(env(safe-area-inset-bottom) + env(keyboard-inset-height, 0px));
  transition: padding-bottom 0.3s ease;
}
```

## Touch Gesture Handling

### Long Press Hook

**File**: `/src/frontend/hooks/useLongPress.ts`

#### Gesture Recognition Implementation
```typescript
interface UseLongPressOptions {
  onLongPress: () => void;
  isMobile: boolean;
  delay?: number;
}

export function useLongPress({ 
  onLongPress, 
  isMobile, 
  delay = 500 
}: UseLongPressOptions) {
  const [isPressed, setIsPressed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preventClickRef = useRef(false);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isMobile) return;
    
    e.preventDefault();
    setIsPressed(true);
    preventClickRef.current = false;
    
    timeoutRef.current = setTimeout(() => {
      onLongPress();
      preventClickRef.current = true;
    }, delay);
  }, [onLongPress, delay, isMobile]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPressed(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (preventClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  // Touch event handlers
  const bind = useMemo(() => ({
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onClick: handleClick,
  }), [start, cancel, handleClick]);

  return { bind, isPressed };
}
```

#### Usage in Message Components
```typescript
// Message.tsx - Long press for mobile context menu
const { bind, isPressed } = useLongPress({
  onLongPress: () => {
    if (!isWelcome) { 
      setShowMobileModal(true);
    }
  },
  isMobile,
});

// Apply to message container with visual feedback
<div
  className={cn(
    'relative group px-4 py-3 rounded-xl',
    isMobile && 'cursor-pointer',
    isPressed && 'scale-95 opacity-70' // Visual feedback during press
  )}
  {...bind}
>
```

### Ripple Effect System

**File**: `/src/frontend/hooks/useRippleEffect.ts`

#### Touch Feedback Implementation
```typescript
interface RippleOptions {
  duration?: number;
  color?: string;
}

export function useRippleEffect({ 
  duration = 600, 
  color = 'rgba(255, 255, 255, 0.6)' 
}: RippleOptions = {}) {
  const [ripples, setRipples] = useState<Array<{ 
    id: string; 
    x: number; 
    y: number; 
    size: number; 
  }>>([]);

  const addRipple = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    
    // Get touch/click coordinates
    const clientX = 'touches' in event 
      ? event.touches[0]?.clientX || event.changedTouches[0]?.clientX
      : event.clientX;
    const clientY = 'touches' in event 
      ? event.touches[0]?.clientY || event.changedTouches[0]?.clientY
      : event.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const size = Math.max(rect.width, rect.height);
    
    const newRipple = {
      id: Date.now().toString(),
      x,
      y,
      size,
    };
    
    setRipples(prev => [...prev, newRipple]);
    
    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, duration);
  }, [duration]);

  return { ripples, addRipple };
}
```

#### CSS Animation Integration
```css
/* Ripple effect animation */
@keyframes ripple {
  0% {
    transform: scale(0);
    opacity: 0.6;
  }
  50% {
    opacity: 0.3;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
}

@media (hover: none) and (pointer: coarse) {
  .ripple-button {
    position: relative;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  .ripple-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: transparent;
    pointer-events: none;
    border-radius: inherit;
  }
}
```

## Virtual Keyboard Management

### Keyboard Insets Hook

**File**: `/src/frontend/hooks/useKeyboardInsets.ts`

#### Dynamic Keyboard Handling
```typescript
export function useKeyboardInsets(callback?: (height: number) => void) {
  useEffect(() => {
    const handleViewportChange = () => {
      if (!window.visualViewport) return;
      
      const keyboardHeight = Math.max(0, 
        window.innerHeight - window.visualViewport.height
      );
      
      // Update CSS custom property
      document.documentElement.style.setProperty(
        '--keyboard-inset-height', 
        `${keyboardHeight}px`
      );
      
      // Optional callback for component-specific handling
      callback?.(keyboardHeight);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      
      // Initial call
      handleViewportChange();
      
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
      };
    }
  }, [callback]);
}
```

#### Integration in Chat Components
```typescript
// Chat.tsx - Keyboard handling for chat interface
useKeyboardInsets((h) => {
  document.documentElement.style.setProperty('--keyboard-inset-height', `${h}px`);
});

// Track virtual keyboard visibility for UI adjustments
const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

useEffect(() => {
  if (!isMobile) return;
  
  const handleResize = () => {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const windowHeight = window.innerHeight;
    const heightDifference = windowHeight - viewportHeight;
    setIsKeyboardVisible(heightDifference > 150);
  };
  
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }
}, [isMobile]);
```

### Input Zoom Prevention

#### CSS-Based Input Styling
```css
/* Prevent zoom on input focus (iOS Safari) */
@media screen and (max-width: 768px) {
  input[type="text"],
  input[type="email"],
  input[type="password"],
  textarea,
  select {
    font-size: 16px !important; /* 16px prevents zoom */
  }
}

/* Remove native appearance */
input, textarea, select {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
}

/* Specific input styling to prevent native controls */
.no-slider input[type="text"],
.no-slider input[type="email"],
.no-slider input[type="password"],
.no-slider input[type="number"],
.no-slider textarea,
.no-slider select {
  -webkit-appearance: textfield !important;
  -moz-appearance: textfield !important;
  appearance: textfield !important;
  background-clip: padding-box !important;
  border-radius: 0.375rem !important;
}
```

## Mobile-Specific UI Adaptations

### Mobile Message Modal

**File**: `/src/frontend/components/message/MobileMessageModal.tsx`

#### Full-Screen Modal Pattern
```typescript
interface MobileMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  message: UIMessage;
  messages: UIMessage[];
  setMessages: UseChatHelpers['setMessages'];
  content: string;
  setMode?: (mode: 'view' | 'edit') => void;
  reload: UseChatHelpers['reload'];
  stop: UseChatHelpers['stop'];
  append: UseChatHelpers['append'];
  forceRegeneration: () => void;
}

function MobileMessageModal({
  isOpen,
  onClose,
  threadId,
  message,
  messages,
  setMessages,
  content,
  setMode,
  reload,
  stop,
  append,
  forceRegeneration,
}: MobileMessageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-screen h-screen max-w-none max-h-none m-0 p-0 rounded-none border-0"
        showCloseButton={false}
      >
        {/* Full-screen mobile modal content */}
        <div className="flex flex-col h-full">
          {/* Header with close button */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">Message Options</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4">
            <MessageControls
              threadId={threadId}
              messages={messages}
              content={content}
              message={message}
              setMode={setMode}
              setMessages={setMessages}
              append={append}
              reload={reload}
              stop={stop}
              isVisible={true}
              forceRegeneration={forceRegeneration}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Mobile Chat Menu

**File**: `/src/frontend/components/mobile/MobileChatMenu.tsx`

#### Contextual Menu Implementation
```typescript
interface MobileChatMenuProps {
  threadId: string;
}

function MobileChatMenu({ threadId }: MobileChatMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="bg-background/60 backdrop-blur-xl border border-border/20 rounded-full h-9 w-9 shadow-lg touch-target"
          aria-label="Chat menu"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-56 mobile-modal-scroll"
      >
        <DropdownMenuItem asChild>
          <NewChatButton className="w-full justify-start" />
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <ChatHistoryButton className="w-full justify-start" />
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <SettingsButton className="w-full justify-start" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Mobile Search Interface

**File**: `/src/frontend/components/mobile/MobileSearch.tsx`

#### Optimized Search UX
```typescript
interface MobileSearchProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  autoFocus?: boolean;
}

function MobileSearch({ 
  placeholder = "Search...", 
  onSearch, 
  autoFocus = false 
}: MobileSearchProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useDebouncedCallback((searchQuery: string) => {
    onSearch(searchQuery);
  }, 300);

  useEffect(() => {
    handleSearch(query);
  }, [query, handleSearch]);

  return (
    <div className={cn(
      "relative w-full transition-all duration-200",
      isFocused && "ring-2 ring-primary ring-offset-2"
    )}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="pl-10 pr-10 h-12 text-base mobile-keyboard-fix"
          autoFocus={autoFocus}
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
```

## PWA Implementation Details

### PWA Install Prompt

**File**: `/src/frontend/components/mobile/PWAInstallPrompt.tsx`

#### Intelligent Install Prompting
```typescript
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // iOS detection
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Standalone mode detection
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Check previous dismissal
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    setDismissed(!!wasDismissed);

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      if (!wasDismissed && !standalone) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (isStandalone || dismissed || (!deferredPrompt && !isIOS) || !showPrompt) {
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm",
      "bg-background/95 backdrop-blur-xl border border-border/20 rounded-2xl shadow-2xl",
      "p-4 animate-in slide-in-from-bottom-4 duration-500"
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 bg-primary/10 rounded-xl">
          {isIOS ? <Smartphone className="h-6 w-6 text-primary" /> : <Download className="h-6 w-6 text-primary" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground">
            Install Pak.Chat
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {isIOS 
              ? "Press Share → Add to Home Screen to install"
              : "Install the app for a better experience"
            }
          </p>
          
          <div className="flex gap-2 mt-3">
            {!isIOS && (
              <Button size="sm" onClick={handleInstall} className="h-8 px-3 text-xs">
                Install
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-8 px-3 text-xs">
              Not now
            </Button>
          </div>
        </div>
        
        <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-6 w-6 flex-shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

### PWA Manifest Configuration

**File**: `/public/manifest.webmanifest`

#### Complete PWA Manifest
```json
{
  "name": "Pak.Chat",
  "short_name": "Pak.Chat",
  "start_url": "/chat",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#000000",
  "background_color": "#000000",
  "scope": "/",
  "icons": [
    {
      "src": "/favicon.ico",
      "sizes": "any",
      "type": "image/x-icon",
      "purpose": "any"
    },
    {
      "src": "/favicon.ico",
      "sizes": "192x192",
      "type": "image/x-icon",
      "purpose": "maskable"
    },
    {
      "src": "/favicon.ico", 
      "sizes": "512x512",
      "type": "image/x-icon",
      "purpose": "any"
    }
  ],
  "categories": ["productivity", "social"],
  "description": "High-Performance LLM Application - chat with artificial intelligence",
  "lang": "ru",
  "dir": "ltr",
  "prefer_related_applications": false,
  "display_override": ["standalone", "minimal-ui"],
  "edge_side_panel": {
    "preferred_width": 400
  }
}
```

#### Service Worker Integration
```typescript
// next.config.ts - PWA configuration
import withPWA from 'next-pwa';

const nextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});
```

### Pull-to-Refresh Implementation

**File**: `/src/frontend/components/mobile/PullToRefresh.tsx`

#### Native-Like Pull Gesture
```typescript
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  resistance?: number;
}

function PullToRefresh({ 
  onRefresh, 
  children, 
  threshold = 80, 
  resistance = 2.5 
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [canPull, setCanPull] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
      setCanPull(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!canPull || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, (currentY - startY) / resistance);
    
    if (distance > 0) {
      e.preventDefault(); // Prevent native pull-to-refresh
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  }, [canPull, isRefreshing, startY, resistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!canPull || isRefreshing) return;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    setCanPull(false);
  }, [canPull, isRefreshing, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const rotationAngle = pullProgress * 180;

  return (
    <div ref={containerRef} className="relative overflow-auto h-full">
      {/* Pull indicator */}
      <div 
        className={cn(
          "absolute top-0 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-200",
          pullDistance > 0 ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          transform: `translateX(-50%) translateY(${Math.max(0, pullDistance - 20)}px)` 
        }}
      >
        <div className="bg-background/95 backdrop-blur-sm rounded-full p-2 shadow-lg border">
          <RefreshCw 
            className={cn(
              "h-5 w-5 text-primary transition-transform duration-200",
              isRefreshing && "animate-spin"
            )}
            style={{ 
              transform: `rotate(${isRefreshing ? 0 : rotationAngle}deg)` 
            }}
          />
        </div>
      </div>
      
      {/* Content with pull offset */}
      <div 
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

## Performance Optimizations for Mobile

### CSS Performance Optimizations

#### Hardware Acceleration
```css
/* Optimize animations for mobile */
.mobile-optimized {
  transform: translateZ(0);
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  will-change: transform;
}

/* Smooth scrolling on mobile */
.enhanced-scroll {
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
}

/* Prevent text selection on interactive elements */
button, .cursor-pointer {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
```

#### Optimized Scrollbars
```css
/* Mobile-specific scrollbar handling */
@media (max-width: 768px) {
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-none {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}

/* Desktop scrollbar styling */
@media (min-width: 769px) {
  .scrollbar-none::-webkit-scrollbar {
    width: 6px;
  }
  .scrollbar-none::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }
  .scrollbar-none::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
}
```

### Mobile Layout Patterns

#### Adaptive Component Sizing
```typescript
// Responsive component sizing based on device
const getComponentSize = (isMobile: boolean, baseSize: string) => {
  if (!isMobile) return baseSize;
  
  const sizeMap = {
    'sm': 'md',
    'md': 'lg',
    'lg': 'xl',
  };
  
  return sizeMap[baseSize] || baseSize;
};

// Usage in components
<Button 
  size={getComponentSize(isMobile, 'sm')} 
  className="touch-target"
>
  Action
</Button>
```

#### Mobile-First Grid System
```css
/* Mobile-first grid patterns */
.mobile-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  .mobile-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .mobile-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Touch-friendly spacing */
.mobile-spacing {
  padding: 1rem;
}

@media (min-width: 768px) {
  .mobile-spacing {
    padding: 1.5rem;
  }
}
```

### Memory Management

#### Mobile-Specific Cleanup
```typescript
// Cleanup for mobile components
useEffect(() => {
  return () => {
    // Clean up object URLs to prevent memory leaks
    if (blobUrl && blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
    }
    
    // Cancel any pending timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Remove event listeners
    if (touchListenerRef.current) {
      document.removeEventListener('touchmove', touchListenerRef.current);
    }
  };
}, []);
```

#### Image Loading Optimization
```typescript
// Optimized image loading for mobile
const ImageComponent = ({ src, alt, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { isMobile } = useIsMobile();
  
  // Use smaller images on mobile
  const optimizedSrc = isMobile && src.includes('?') 
    ? `${src}&w=400&h=400&fit=crop`
    : src;
  
  return (
    <div className="relative overflow-hidden">
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      <Image
        src={optimizedSrc}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading="lazy"
        decoding="async"
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        {...props}
      />
      
      {hasError && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <ImageOff className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};
```

## Offline Functionality

### Service Worker Configuration

#### Caching Strategy
```typescript
// next-pwa configuration for offline support
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
  ],
});
```

#### Offline Detection
```typescript
// Offline state management
function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(false);
  
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    setIsOffline(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOffline;
}

// Offline indicator component
function OfflineIndicator() {
  const isOffline = useOfflineStatus();
  
  if (!isOffline) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground text-center py-2 text-sm z-50">
      <WifiOff className="inline h-4 w-4 mr-2" />
      You are currently offline
    </div>
  );
}
```

## Testing Strategies for Mobile

### Mobile Testing Patterns

#### Touch Event Testing
```typescript
describe('Mobile Interactions', () => {
  it('handles long press gestures', () => {
    const onLongPress = jest.fn();
    const { getByTestId } = render(
      <div {...useLongPress({ onLongPress, isMobile: true })}>
        Touch me
      </div>
    );
    
    const element = getByTestId('touchable');
    
    // Simulate touch start
    fireEvent.touchStart(element);
    
    // Wait for long press delay
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(onLongPress).toHaveBeenCalled();
  });
  
  it('responds to swipe gestures', () => {
    // Test swipe gesture implementation
  });
  
  it('handles virtual keyboard appearance', () => {
    // Test keyboard handling
  });
});
```

#### Responsive Design Testing
```typescript
describe('Responsive Design', () => {
  it('adapts to mobile viewport', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    const { container } = render(<ResponsiveComponent />);
    
    expect(container.firstChild).toHaveClass('mobile-layout');
  });
  
  it('handles orientation changes', () => {
    // Test orientation change handling
  });
});
```

#### PWA Testing
```typescript
describe('PWA Functionality', () => {
  it('shows install prompt when appropriate', () => {
    // Mock beforeinstallprompt event
    const mockEvent = new Event('beforeinstallprompt');
    
    const { queryByText } = render(<PWAInstallPrompt />);
    
    window.dispatchEvent(mockEvent);
    
    expect(queryByText('Install Pak.Chat')).toBeInTheDocument();
  });
  
  it('handles offline state correctly', () => {
    // Test offline functionality
  });
});
```

## Best Practices and Guidelines

### Mobile UX Principles

1. **Touch-First Design**: All interactive elements have minimum 44px touch targets
2. **Gesture Support**: Implement long press, swipe, and pinch gestures where appropriate
3. **Performance**: Optimize for lower-powered mobile devices
4. **Accessibility**: Ensure proper contrast ratios and screen reader support
5. **Responsive**: Design works across all screen sizes and orientations

### Implementation Guidelines

#### Component Structure
```typescript
// Mobile-first component pattern
function MobileOptimizedComponent({ ...props }) {
  const { isMobile } = useIsMobile();
  
  if (isMobile) {
    return <MobileLayout {...props} />;
  }
  
  return <DesktopLayout {...props} />;
}

// Alternative: CSS-based responsive design
function ResponsiveComponent({ ...props }) {
  return (
    <div className={cn(
      "w-full",
      "p-4 sm:p-6 lg:p-8", // Progressive enhancement
      "text-base sm:text-sm", // Larger text on mobile
      "touch-target" // Ensure proper touch targets
    )}>
      {/* Component content */}
    </div>
  );
}
```

#### Performance Considerations
- Use `will-change` CSS property sparingly and only during animations
- Implement virtual scrolling for long lists
- Optimize images with responsive sizing
- Use hardware acceleration for smooth animations
- Minimize DOM manipulations during touch events

The mobile components system provides a comprehensive foundation for building responsive, accessible, and performant mobile web applications with native app-like behavior and PWA capabilities.