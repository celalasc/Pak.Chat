# UI System Components Documentation

## Overview

Pak.Chat implements a comprehensive design system built on top of Tailwind CSS with shadcn/ui components, featuring a dual-theme system (light/dark), custom fonts, and mobile-first responsive design patterns. The UI system provides a cohesive set of reusable components that maintain consistency across the application while supporting advanced features like syntax highlighting, animations, and accessibility.

## Design System Principles

### Color System

The application uses a sophisticated color system based on OKLCH color space for better perceptual uniformity:

#### Light Theme Colors (globals.css:60-96)
```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --muted: oklch(0.97 0 0);
  --accent: oklch(0.97 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  /* Additional color tokens... */
}
```

#### Dark Theme Colors (globals.css:111-159)
```css
.dark {
  --background: oklch(0.2178 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  /* Dark theme variants... */
}
```

### Typography System

#### Font Family Configuration (globals.css:36-58)
- **Primary Font**: Proxima Vara (400, 600 weights)
- **Monospace Font**: Berkeley Mono (400 weight)
- **System Fallbacks**: Comprehensive fallback chains

```css
@font-face {
  font-family: 'Proxima Vara';
  src: url('/fonts/ProximaVara-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

#### Font Variables
```css
--font-sans: 'Proxima Vara', system-ui, sans-serif;
--font-mono: 'Berkeley Mono', 'SF Mono', Monaco, monospace;
```

### Spacing and Layout

#### Border Radius System
```css
--radius: 0.625rem; /* 10px base radius */
--radius-sm: calc(var(--radius) - 4px);
--radius-md: calc(var(--radius) - 2px);
--radius-lg: var(--radius);
--radius-xl: calc(var(--radius) + 4px);
```

#### Shadow System
```css
--shadow-xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
--shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 1px 2px -1px hsl(0 0% 0% / 0.1);
--shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 2px 4px -1px hsl(0 0% 0% / 0.1);
/* Additional shadow levels... */
```

## Base UI Components

### Button Component

**File**: `/src/frontend/components/ui/button.tsx`

#### Component API
```typescript
interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}
```

#### Implementation Details
- Built with class-variance-authority (CVA) for type-safe variant handling
- Supports polymorphic rendering via Radix Slot
- Implements comprehensive focus management with ring styles
- Includes disabled state handling with opacity and cursor changes

#### Variant Definitions (button.tsx:7-36)
```typescript
const buttonVariants = cva(
  'cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive: 'bg-destructive text-white shadow-xs hover:bg-destructive/90',
        outline: 'border border-white bg-background shadow-xs hover:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9'
      }
    }
  }
);
```

#### Usage Examples
```typescript
// Basic button
<Button variant="default" size="sm">Click me</Button>

// Icon button
<Button variant="ghost" size="icon">
  <SearchIcon className="h-4 w-4" />
</Button>

// As child (polymorphic)
<Button asChild>
  <Link href="/chat">Start Chat</Link>
</Button>
```

### Dialog Component

**File**: `/src/frontend/components/ui/dialog.tsx`

#### Component Structure
- Built on Radix UI Dialog primitive
- Provides compound component pattern
- Includes overlay, content, header, footer, title, and description
- Supports customizable close button

#### API Components
```typescript
// Root component
<Dialog open={isOpen} onOpenChange={setIsOpen}>

// Trigger
<DialogTrigger asChild>
  <Button>Open Dialog</Button>
</DialogTrigger>

// Content with automatic overlay
<DialogContent showCloseButton={true}>
  <DialogHeader>
    <DialogTitle>Dialog Title</DialogTitle>
    <DialogDescription>Dialog description</DialogDescription>
  </DialogHeader>
  
  {/* Content */}
  
  <DialogFooter>
    <Button variant="outline">Cancel</Button>
    <Button>Confirm</Button>
  </DialogFooter>
</DialogContent>
```

#### Animation System (dialog.tsx:62-64)
```typescript
className={cn(
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg"
)}
```

### Input Component

**File**: `/src/frontend/components/ui/input.tsx`

#### Implementation
```typescript
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}
```

#### Features
- Responsive font sizing (base on mobile, sm on desktop)
- File input styling support
- Comprehensive focus states with ring indicators
- Validation state styling (aria-invalid)
- Dark mode background transparency

## Component Composition Patterns

### Compound Components
The UI system heavily uses compound component patterns for complex components like Dialog, ensuring proper accessibility and state management:

```typescript
// Pattern implementation in Dialog
function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogContent({ className, children, showCloseButton = true, ...props }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content>
        {children}
        {showCloseButton && <DialogClose />}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}
```

### Slot Pattern Integration
Components support the Radix Slot pattern for polymorphic rendering:

```typescript
const Comp = asChild ? Slot : 'button';
return (
  <Comp
    ref={ref}
    data-slot="button"
    className={cn(buttonVariants({ variant, size, className }))}
    {...props}
  />
);
```

## Styling System with Tailwind CSS

### Custom Utility Classes

#### Mobile-Specific Utilities (globals.css:270-336)
```css
/* Mobile-only scrollbar hiding */
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
}
```

#### Enhanced Scroll Utilities
```css
.enhanced-scroll {
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  overscroll-behavior: contain;
}
```

#### Safe Area Utilities for Mobile
```css
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}

.pt-safe {
  padding-top: env(safe-area-inset-top);
}
```

### Tailwind Configuration

The system uses Tailwind v4 with inline theme configuration:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --radius-lg: var(--radius);
  /* Complete theme mapping... */
}
```

## Theme System and Dark Mode Implementation

### Theme Provider

**File**: `/src/frontend/components/ui/ThemeProvider.tsx`

```typescript
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

#### Integration in Layout
The theme system integrates with next-themes for:
- System preference detection
- Persistent theme storage
- Smooth theme transitions
- SSR compatibility

### Theme Settings Store

**File**: `/src/frontend/stores/SettingsStore.ts:1-102`

#### Theme Configuration
```typescript
type Settings = {
  generalFont: GeneralFont;
  codeFont: CodeFont;
  theme: Theme; // 'light' | 'dark'
  hidePersonal: boolean;
  showNavBars: boolean;
  showChatPreview: boolean;
  customInstructions?: CustomInstructions;
};

const defaultSettings: Settings = {
  generalFont: 'Proxima Vara',
  codeFont: 'Berkeley Mono',
  theme: 'light',
  hidePersonal: true,
  showNavBars: true,
  showChatPreview: true,
};
```

#### Persistence with Zustand
```typescript
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      setSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },
      resetSettings: () => {
        set({ settings: defaultSettings });
      },
    }),
    {
      name: 'user-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
```

### Dynamic Theme Variables

#### Shiki Code Highlighting Theme Support (globals.css:17-33)
```css
:root {
  --shiki-color-text: #0f172a;
  --shiki-color-background: transparent;
  --shiki-token-constant: #b45309;
  --shiki-token-string: #15803d;
  --shiki-token-comment: #64748b;
  --shiki-token-keyword: #7c3aed;
  --shiki-token-function: #2563eb;
}

[data-theme='dark'] {
  --shiki-color-text: #e2e8f0;
}
```

## Animation System with Framer Motion

### CSS Animations

#### Quote Highlighting Animation (globals.css:352-363)
```css
.quote-highlight {
  animation: quote-highlight 0.3s ease-in-out;
}

@keyframes quote-highlight {
  0% {
    background-color: rgba(59, 130, 246, 0.3);
  }
  100% {
    background-color: transparent;
  }
}
```

#### Mobile Slide Animations (globals.css:365-394)
```css
.mobile-slide-left {
  animation: slide-left 0.3s ease-in-out;
}

@keyframes slide-left {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(-100%);
    opacity: 0;
  }
}
```

#### Shine Text Animation (globals.css:695-737)
```css
.shine-text {
  background: linear-gradient(
    90deg,
    #9ca3af 0%,
    #f9fafb 20%,
    #9ca3af 40%,
    #9ca3af 60%,
    #f9fafb 80%,
    #9ca3af 100%
  );
  background-size: 200% 100%;
  animation: shine 2s ease-in-out infinite;
}
```

### Framer Motion Integration

The application uses Framer Motion (v12.18.1) for:
- Page transitions
- Component enter/exit animations
- Gesture-based interactions
- Spring physics animations

#### Package Dependencies (package.json:41-46)
```json
"framer-motion": "^12.18.1",
"motion": "^12.23.0"
```

## Accessibility Features and ARIA Implementation

### Focus Management

#### Ring Focus Indicators
All interactive elements implement consistent focus indicators:

```css
/* Button focus states */
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]

/* Input focus states */
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
```

#### Aria Invalid States
```css
aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive
```

### Screen Reader Support

#### Semantic HTML Structure
Components use proper semantic elements and ARIA attributes:

```typescript
// Dialog example
<DialogPrimitive.Title
  data-slot="dialog-title"
  className={cn("text-lg leading-none font-semibold", className)}
  {...props}
/>

<DialogPrimitive.Description
  data-slot="dialog-description"
  className={cn("text-muted-foreground text-sm", className)}
  {...props}
/>
```

#### Screen Reader Only Content
```typescript
<span className="sr-only">Close</span>
```

### Keyboard Navigation

#### Touch Target Requirements (globals.css:587-591)
```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

## Component Testing Patterns

### Test Configuration

**File**: `/vitest.config.ts`

#### Testing Setup
```typescript
export default defineConfig({
  test: {
    workspace: [
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }]
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});
```

### Component Testing Strategy

#### Storybook Integration
- Components are tested using Storybook stories
- Visual regression testing with Playwright
- Accessibility testing integration
- Cross-browser compatibility testing

#### Testing Patterns
```typescript
// Example component test structure
describe('Button Component', () => {
  it('renders with correct variant styles', () => {
    // Test variant styling
  });
  
  it('handles keyboard navigation', () => {
    // Test keyboard interactions
  });
  
  it('supports screen readers', () => {
    // Test ARIA attributes
  });
  
  it('works in dark mode', () => {
    // Test theme switching
  });
});
```

## Performance Considerations

### CSS Optimization

#### Critical CSS Inlining
The theme system uses inline CSS for critical styling to prevent FOUC:

```css
@theme inline {
  /* Critical theme variables inlined */
}
```

#### Scroll Performance
```css
.enhanced-scroll {
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  overscroll-behavior: contain;
}
```

### Component Optimization

#### Memoization Patterns
Components use React.memo with custom comparison functions:

```typescript
const optimizedComponent = memo(Component, (prevProps, nextProps) => {
  return (
    prevProps.variant === nextProps.variant &&
    prevProps.size === nextProps.size &&
    prevProps.children === nextProps.children
  );
});
```

#### Lazy Loading
Non-critical UI components are lazy loaded to improve initial bundle size.

## Usage Guidelines

### Best Practices

1. **Variant Usage**: Use semantic variants (primary, secondary, destructive) rather than visual descriptors
2. **Size Consistency**: Maintain consistent sizing across related components
3. **Focus States**: Always ensure proper focus indicators for accessibility
4. **Theme Support**: Test all components in both light and dark themes
5. **Mobile First**: Design for mobile first, then enhance for desktop

### Component Selection Guide

- **Button**: Use for all interactive actions, choose appropriate variant and size
- **Dialog**: Use for modal interactions, confirmations, and forms
- **Input**: Use for all text input, includes built-in validation states
- **Theme Provider**: Wrap app root to enable theme switching

### Common Patterns

#### Form Components
```typescript
<div className="space-y-4">
  <div>
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" placeholder="Enter email" />
  </div>
  <div className="flex gap-2">
    <Button variant="outline">Cancel</Button>
    <Button type="submit">Save</Button>
  </div>
</div>
```

#### Modal Dialogs
```typescript
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Open Settings</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Settings</DialogTitle>
    </DialogHeader>
    {/* Form content */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

This comprehensive UI system provides a solid foundation for building consistent, accessible, and performant user interfaces while maintaining design system principles and supporting both light and dark themes.