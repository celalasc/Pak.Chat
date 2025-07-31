# Chat Components Documentation

## Overview

Pak.Chat implements a sophisticated chat system with streaming message support, real-time syntax highlighting, message editing, quoting, branching, and comprehensive file handling. The chat components are designed for high performance with optimized rendering, memory management, and mobile-first responsive design.

## Chat Container and Layout Components

### Chat Component

**File**: `/src/frontend/components/Chat.tsx`

#### Component API
```typescript
interface ChatProps {
  threadId: string;
  thread: Doc<'threads'> | null | undefined;
  initialMessages: UIMessage[];
  projectId?: Id<"projects">;
  project?: Doc<"projects">;
  customLayout?: boolean;
  onThreadCreated?: (threadId: Id<'threads'>) => void;
}
```

#### Implementation Overview
The Chat component serves as the main container orchestrating the entire chat experience. It handles:

- **Navigation Management**: Desktop/mobile navigation patterns
- **Thread State**: Thread creation and navigation
- **Keyboard Integration**: Virtual keyboard handling on mobile
- **Layout Coordination**: Responsive layout switching

#### Key Features (Chat.tsx:33-255)

##### Mobile Navigation Pattern
```typescript
// Mobile version - contextual navigation based on thread state
{currentThreadId ? (
  // Existing chat - back button + menu
  <>
    <div className={mobileBackButtonClasses}>
      <WithTooltip label="Back to Home" side="bottom">
        <Button variant="ghost" size="icon" onClick={handleGoHome}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </WithTooltip>
    </div>
    <div className={mobileMenuButtonClasses}>
      <MobileChatMenu threadId={currentThreadId} />
    </div>
  </>
) : (
  // New chat - simple back button
  <div className="fixed left-4 top-4 z-50">
    <Button onClick={handleGoHome}>
      <ArrowLeft className="h-4 w-4" />
    </Button>
  </div>
)}
```

##### Desktop Navigation Pattern
```typescript
// Desktop version - persistent control panel
<div className="fixed right-4 top-4 z-50 flex gap-2 p-1 bg-background/60 backdrop-blur-md rounded-lg border border-border/20">
  <NewChatButton className="backdrop-blur-sm" projectId={projectId} />
  <ChatHistoryButton className="backdrop-blur-sm" projectId={projectId} />
  <SettingsDrawer>
    <Button variant="outline" size="icon">
      <Settings className="h-5 w-5" />
    </Button>
  </SettingsDrawer>
</div>
```

##### Virtual Keyboard Handling
```typescript
// Track virtual keyboard visibility for mobile UI adjustments
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

### ChatView Component

**File**: `/src/frontend/components/ChatView.tsx`

#### Component API
```typescript
interface ChatViewProps {
  threadId: string;
  thread: Doc<'threads'> | null | undefined;
  initialMessages: UIMessage[];
  showNavBars: boolean;
  onThreadCreated?: (newThreadId: string) => void;
  projectId?: Id<"projects">;
  project?: Doc<"projects">;
  customLayout?: boolean;
}
```

#### Core Responsibilities

##### Message State Management
The ChatView manages complex message state with multiple sources:

```typescript
// Merged messages from UI state and Convex backend
const mergedMessages = React.useMemo(() => {
  if (!convexMessages || convexMessages.length === 0) {
    return messages; // Use UI messages when no backend data
  }

  // Create maps for efficient lookup
  const uiMessagesMap = new Map(messages.map(m => [m.id, m]));
  
  // Enrich Convex messages with UI state
  const enrichedConvexMessages = convexMessages.map(convexMsg => {
    const uiMsg = uiMessagesMap.get(convexMsg._id);
    
    if (uiMsg) {
      return {
        ...convexMsg,
        ...uiMsg,
        id: convexMsg._id,
        createdAt: new Date(convexMsg.createdAt),
        imageGeneration: uiMsg.imageGeneration || convexMsg.metadata?.imageGeneration,
        attachments: uiMsg.attachments || convexMsg.attachments || [],
      };
    }
    
    return {
      id: convexMsg._id as string,
      role: convexMsg.role as 'user' | 'assistant',
      content: convexMsg.content,
      createdAt: new Date(convexMsg.createdAt),
      parts: [{ type: 'text' as const, text: convexMsg.content }],
      attachments: convexMsg.attachments || [],
      imageGeneration: convexMsg.metadata?.imageGeneration,
    };
  });
  
  // Add temporary messages not yet in backend
  const convexIds = new Set(convexMessages.map(cm => cm._id as string));
  const temporaryMessages = messages.filter(m => !convexIds.has(m.id));
  
  return [...enrichedConvexMessages, ...temporaryMessages];
}, [messages, convexMessages]);
```

##### AI Integration with Custom Fetch Handler
```typescript
const {
  messages,
  input,
  setInput,
  reload,
  stop,
  append,
  status,
  error,
} = useChat({
  api: apiEndpoint,
  id: chatKey,
  initialMessages,
  body: requestBody,
  experimental_prepareRequestBody: prepareRequestBody,
  experimental_throttle: 50, // Smooth streaming updates
  
  fetch: async (url, init) => {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    const isImageGeneration = body?.imageGeneration?.enabled;
    
    // Handle image generation with loading states
    if (isImageGeneration) {
      const loadingMessageId = `image-gen-loading-${Date.now()}`;
      const loadingMessage = {
        id: loadingMessageId,
        role: 'assistant',
        content: '',
        createdAt: new Date(),
        parts: [{ type: 'text', text: '' }],
        imageGeneration: {
          prompt: body.messages[body.messages.length - 1]?.content || '',
          images: [],
          params: body.imageGeneration.params,
          isGenerating: true,
        },
      };
      
      setTimeout(() => {
        originalSetMessages((prev) => [...prev, loadingMessage]);
      }, 50);
    }
    
    return fetch(url, init);
  },
  
  onFinish: async (finalMsg) => {
    // Save assistant messages to backend
    if (finalMsg.role === 'assistant' && finalMsg.content.trim() !== '' && isConvexId(latestThreadId)) {
      const realId = await sendMessage({
        threadId: latestThreadId as Id<'threads'>,
        role: 'assistant',
        content: finalMsg.content,
        model: currentModel,
      });
      
      // Update local state with real ID
      originalSetMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === finalMsg.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], id: realId, model: currentModel };
        return next;
      });
    }
  },
});
```

## Message Rendering System with Streaming

### Message Component

**File**: `/src/frontend/components/message/Message.tsx`

#### Component Structure
```typescript
interface MessageProps {
  threadId: string;
  message: UIMessage;
  setMessages: UseChatHelpers['setMessages'];
  messages: UIMessage[];
  reload: UseChatHelpers['reload'];
  append: UseChatHelpers['append'];
  isStreaming: boolean;
  stop: UseChatHelpers['stop'];
  forceRegeneration: () => void;
}
```

#### Advanced Features

##### Reasoning Extraction and Display
```typescript
// Extract reasoning from <think> tags for models like DeepSeek
const reasoningData = useMemo(() => {
  if (isStreaming) return null; // Skip during streaming for performance
  
  const extractReasoning = (text: string) => {
    const openTag = text.indexOf('<think>');
    const closeTag = text.indexOf('</think>');
    
    if (openTag === -1) return null;
    
    const startIndex = openTag + 7;
    const endIndex = closeTag > -1 ? closeTag : text.length;
    const rawReasoning = text.slice(startIndex, endIndex);
    const cleanReasoning = rawReasoning.replace(/g:"([^"]*)"/g, '$1');
    
    return {
      reasoning: cleanReasoning,
      isComplete: closeTag > -1
    };
  };

  for (const part of message.parts) {
    if (part.type === 'text' && part.text?.includes('<think>')) {
      return extractReasoning(part.text);
    }
  }
  return null;
}, [message.id, isStreaming, message.parts]);
```

##### AI Image Generation Integration
```typescript
// Handle AI image generation messages
if (message.role === 'assistant' && imageGeneration) {
  return (
    <AIImageGeneration
      prompt={imageGeneration.prompt}
      images={imageGeneration.images}
      params={imageGeneration.params}
      isGenerating={imageGeneration.isGenerating}
      isStopped={imageGeneration.isStopped}
      onRegenerate={async () => {
        stop(); // Stop current stream
        
        // Find parent user message for regeneration
        const currentIndex = messages.findIndex((m) => m.id === message.id);
        let parentMessageIndex = -1;
        for (let i = currentIndex; i >= 0; i--) {
          if (messages[i].role === 'user') {
            parentMessageIndex = i;
            break;
          }
        }
        
        // Clean database and regenerate
        if (isConvexId(parentMessageToResend.id)) {
          await prepareForRegenerate({
            threadId: threadId as Id<'threads'>,
            userMessageId: parentMessageToResend.id as Id<'messages'>,
          });
        }
        
        setImageGenerationMode(true);
        setMessages(messagesUpToParent);
        reload({ body: { imageGeneration: { enabled: true, params } } });
      }}
    />
  );
}
```

##### Attachment Rendering
```typescript
// Render image attachments with lightbox support
{attachments && attachments.length > 0 && (
  <div className="flex gap-2 flex-wrap mb-3">
    {attachments.map((a, index) =>
      a.type.startsWith('image') && a.url ? (
        <Image
          key={`${a.id}-${index}`}
          src={a.url}
          className="h-32 w-32 rounded cursor-pointer hover:scale-105 transition object-cover"
          onClick={() => {
            const imageUrl = a.originalUrl || a.url;
            setLightbox({
              url: imageUrl,
              name: a.name,
              type: a.type,
              size: a.size,
            });
          }}
          alt={a.name}
          width={128}
          height={128}
          loading="eager"
          decoding="async"
        />
      ) : (
        <a
          key={`${a.id}-${index}`}
          href={a.url}
          target="_blank"
          className="h-10 w-28 bg-muted rounded flex flex-col items-center justify-center text-[10px] px-1 hover:bg-accent"
        >
          <span className="line-clamp-1">{a.name}</span>
          <span className="text-muted-foreground">{a.ext}</span>
        </a>
      )
    )}
  </div>
)}
```

##### Mobile Long Press Integration
```typescript
const { bind, isPressed } = useLongPress({
  onLongPress: () => {
    if (!isWelcome) { 
      setShowMobileModal(true);
    }
  },
  isMobile,
});

// Apply to message container
<div
  className={cn(
    'relative group px-4 py-3 rounded-xl',
    isMobile && 'cursor-pointer',
    isPressed && 'scale-95 opacity-70'
  )}
  {...bind}
>
```

### MemoizedMarkdown Component

**File**: `/src/frontend/components/MemoizedMarkdown.tsx`

#### Advanced Markdown Processing

##### Streaming-Aware Rendering
```typescript
const MemoizedMarkdown = memo(({ content, streaming = false }: MemoizedMarkdownProps) => {
  // Remove reasoning tags from main content
  const sanitizedContent = useMemo(() => content
    .replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '') // Remove <think> blocks
    .replace(/\bg:"[^"]+"/g, '') // Remove g:"..." tokens
    .trim(), [content]);

  // For streaming, render as single block for performance
  const blocks = useMemo(() => {
    if (streaming) {
      return [sanitizedContent];
    }
    return parseMarkdownIntoBlocks(sanitizedContent);
  }, [sanitizedContent, streaming]);

  return (
    <MarkdownContext.Provider value={{ size: 'default', isStreaming: streaming }}>
      <div className={proseClasses}>
        {blocks.map((block, index) => (
          <MarkdownRendererBlock
            content={block}
            key={streaming ? 'streaming-block' : `markdown-block-${index}`}
          />
        ))}
      </div>
    </MarkdownContext.Provider>
  );
});
```

##### Custom Components Integration
```typescript
const components: Components = {
  code: CodeBlock as Components['code'],
  pre: ({ children }) => <>{children}</>, // Remove default pre wrapper
};

function CodeBlock({ children, className, ...props }: CodeComponentProps) {
  const { size, isStreaming } = useContext(MarkdownContext);
  const match = /language-(\w+)/.exec(className || '');

  if (match && children) {
    return (
      <StreamingCodeBlock
        lang={match[1]}
        codeString={String(children).replace(/\n$/, '')}
        isStreaming={isStreaming}
      />
    );
  }

  // Inline code styling
  const inlineCodeClasses = size === 'small'
    ? 'mx-0.5 overflow-auto rounded-md px-1 py-0.5 bg-secondary px-1.5 py-1 font-mono text-xs'
    : 'mx-0.5 overflow-auto rounded-md px-2 py-1 bg-secondary px-1.5 py-1 font-mono text-sm';

  return <code className={inlineCodeClasses} {...props}>{children}</code>;
}
```

## Chat Input System with Attachments

### ChatInput Component

**File**: `/src/frontend/components/chat-input/ChatInput.tsx`

#### Comprehensive Input Management

##### Auto-Resizing TextArea Integration
```typescript
const { textareaRef, adjustHeight } = useAutoResizeTextarea({
  minHeight: 72,
  maxHeight: 200,
});

const handleInputChange = useCallback(
  (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInput(newValue);
    adjustHeight(); // Dynamically adjust height
    debouncedSaveDraft(newValue); // Save draft with debouncing
  },
  [setInput, adjustHeight, debouncedSaveDraft]
);
```

##### Draft Management with Persistence
```typescript
// Debounced draft saving to reduce server load
const debouncedSaveDraft = useDebouncedCallback((draftText: string) => {
  const currentThreadId = sessionThreadId || threadId;
  if (isConvexId(currentThreadId)) {
    saveDraftMutation({ 
      threadId: currentThreadId as Id<'threads'>, 
      draft: draftText 
    });
  }
}, 500);

// Load draft when switching threads
useEffect(() => {
  if (!initialDraftLoadedRef.current && typeof thread?.draft === 'string') {
    setInput(thread.draft);
    adjustHeight();
    initialDraftLoadedRef.current = true;
  }
}, [thread?.draft, setInput, adjustHeight]);
```

##### Multi-Modal Input Support
```typescript
// Support for text, attachments, quotes, and image generation
<div className="flex flex-col">
  {/* Attachments display */}
  {attachments.length > 0 && (
    <div className="bg-white dark:bg-secondary px-4 pt-3">
      <AttachmentsBar mode="full" />
    </div>
  )}
  
  {/* Quote display */}
  {currentQuote && (
    <div className="bg-white dark:bg-secondary px-4 pt-3">
      <QuoteDisplay quote={currentQuote} onRemove={clearQuote} />
    </div>
  )}
  
  {/* Text input area */}
  <div className="bg-white dark:bg-secondary overflow-y-auto max-h-[300px]">
    <ChatTextArea
      ref={combinedRef}
      value={input}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      disabled={!canChat}
      isImageGenerationMode={isImageGenerationMode}
    />
  </div>
</div>
```

### ChatTextArea Component

**File**: `/src/frontend/components/chat-input/components/TextArea/ChatTextArea.tsx`

#### Enhanced Textarea Features
```typescript
interface ChatTextAreaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  isImageGenerationMode?: boolean;
}

const ChatTextArea = forwardRef<HTMLTextAreaElement, ChatTextAreaProps>(
  ({ value, onChange, onKeyDown, disabled, isImageGenerationMode, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={
          isImageGenerationMode 
            ? "Describe the image you want to generate..." 
            : "Type your message... (Press Enter to send, Shift+Enter for new line)"
        }
        className={cn(
          "w-full min-h-[48px] max-h-[300px] px-4 py-3 bg-transparent border-0 outline-none resize-none",
          "placeholder:text-muted-foreground text-foreground",
          "scrollbar-hide",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        rows={1}
        {...props}
      />
    );
  }
);
```

### DragDropArea Component

**File**: `/src/frontend/components/chat-input/components/TextArea/DragDropArea.tsx`

#### File Drop Handling
```typescript
interface DragDropAreaProps {
  children: React.ReactNode;
  messageCount: number;
}

export function DragDropArea({ children, messageCount }: DragDropAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { handleDrop, handleDragOver, handleDragLeave } = useDragDrop({
    onDragStateChange: setIsDragOver,
    messageCount,
  });

  return (
    <div
      className={cn(
        "relative transition-all duration-200",
        isDragOver && "ring-2 ring-primary ring-offset-2 bg-primary/5"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {children}
      
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-50">
          <div className="text-center">
            <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-primary">Drop files to attach</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Message Controls and Interactions

### MessageControls Component

**File**: `/src/frontend/components/message/MessageControls.tsx`

#### Action Button Implementation
```typescript
interface MessageControlsProps {
  threadId: string;
  messages: UIMessage[];
  content: string;
  message: UIMessage;
  setMode?: (mode: 'view' | 'edit') => void;
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  reload: UseChatHelpers['reload'];
  stop: UseChatHelpers['stop'];
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  forceRegeneration: () => void;
}

// Core control buttons with tooltips and accessibility
const controls = [
  {
    icon: Copy,
    label: 'Copy',
    onClick: () => copyText(content),
    show: true,
  },
  {
    icon: Quote,
    label: 'Quote',
    onClick: () => setQuote({ text: content, messageId: message.id }),
    show: true,
  },
  {
    icon: RotateCcw,
    label: 'Regenerate',
    onClick: handleRegenerate,
    show: message.role === 'assistant',
  },
  {
    icon: GitBranch,
    label: 'Branch',
    onClick: handleBranch,
    show: message.role === 'assistant' && isConvexId(threadId),
  },
  {
    icon: Edit,
    label: 'Edit',
    onClick: () => setMode?.('edit'),
    show: message.role === 'user' && !!setMode,
  },
];
```

### QuoteButton and QuoteDisplay

**File**: `/src/frontend/components/message/QuoteButton.tsx`
**File**: `/src/frontend/components/message/QuoteDisplay.tsx`

#### Quote System Implementation
```typescript
// Quote state management
interface Quote {
  text: string;
  messageId: string;
}

// Quote display with removal capability
function QuoteDisplay({ quote, onRemove }: { quote: Quote; onRemove: () => void }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border-l-4 border-primary">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-1">Quoting message</div>
        <div className="text-sm line-clamp-3">{quote.text}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-6 w-6 flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

### MessageEditor Component

**File**: `/src/frontend/components/message/MessageEditor.tsx`

#### In-Place Message Editing
```typescript
interface MessageEditorProps {
  threadId: string;
  message: UIMessage;
  content: string;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  setMode: (mode: 'view' | 'edit') => void;
  stop: UseChatHelpers['stop'];
}

function MessageEditor({ threadId, message, content, setMessages, reload, setMode, stop }: MessageEditorProps) {
  const [editedContent, setEditedContent] = useState(content);
  
  const handleSave = useCallback(async () => {
    if (editedContent.trim() === content.trim()) {
      setMode('view');
      return;
    }

    // Update local message immediately
    setMessages((prev) => 
      prev.map((m) => 
        m.id === message.id 
          ? { ...m, content: editedContent, parts: [{ type: 'text', text: editedContent }] }
          : m
      )
    );

    // Find messages after the edited one for regeneration
    const currentIndex = messages.findIndex((m) => m.id === message.id);
    const messagesToRegenerate = messages.slice(currentIndex + 1);
    
    if (messagesToRegenerate.length > 0) {
      // Remove subsequent messages and regenerate
      setMessages((prev) => prev.slice(0, currentIndex + 1));
      
      setTimeout(() => {
        reload({
          body: {
            model: selectedModel,
            apiKeys: keys,
            threadId,
            search: webSearchEnabled,
          },
        });
      }, 100);
    }

    setMode('view');
  }, [editedContent, content, message.id, setMessages, setMode, reload]);

  return (
    <div className="space-y-2">
      <textarea
        value={editedContent}
        onChange={(e) => setEditedContent(e.target.value)}
        className="w-full min-h-[100px] p-3 border rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
        autoFocus
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave}>
          Save & Regenerate
        </Button>
        <Button size="sm" variant="outline" onClick={() => setMode('view')}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

## Message Threading and Branching

### Thread Management

#### Thread Creation and Navigation
```typescript
// Handle thread creation for new conversations
const handleThreadCreated = useCallback((newThreadId: string) => {
  setCurrentThreadId(newThreadId);
  threadIdRef.current = newThreadId;
  onThreadCreated?.(newThreadId);
}, [onThreadCreated]);

// Thread cloning for branching conversations
const cloneThread = useMutation(api.threads.clone);

const handleBranch = async () => {
  if (!isConvexId(threadId)) return;
  
  const title = thread?.title ?? content.slice(0, 30);
  const newId = await cloneThread({
    threadId: threadId as Id<'threads'>,
    title,
  });
  router.push(`/chat/${newId}`);
};
```

#### Message Regeneration with State Management
```typescript
const handleRegenerate = async () => {
  stop(); // Stop current stream
  
  const currentIndex = messages.findIndex((m) => m.id === message.id);
  if (currentIndex === -1) return;

  // Find parent user message
  let parentMessageIndex = -1;
  for (let i = currentIndex; i >= 0; i--) {
    if (messages[i].role === 'user') {
      parentMessageIndex = i;
      break;
    }
  }

  if (parentMessageIndex === -1) return;

  const parentMessageToResend = messages[parentMessageIndex];

  // Clean database if needed
  if (isConvexId(parentMessageToResend.id)) {
    await prepareForRegenerate({
      threadId: threadId as Id<'threads'>,
      userMessageId: parentMessageToResend.id as Id<'messages'>,
    });
  }

  // Trim messages and regenerate
  const messagesUpToParent = messages.slice(0, parentMessageIndex + 1);
  setMessages(messagesUpToParent);
  forceRegeneration();

  // Trigger regeneration with current settings
  reload({
    body: {
      model: selectedModel,
      apiKeys: keys,
      threadId,
      search: webSearchEnabled,
    },
  });
};
```

## File Upload and Preview System

### AttachmentsBar Component

**File**: `/src/frontend/components/AttachmentsBar.tsx`

#### Multi-Mode Attachment Display
```typescript
interface AttachmentsBarProps {
  mode: 'compact' | 'full';
  messageCount?: number;
}

function AttachmentsBar({ mode, messageCount = 0 }: AttachmentsBarProps) {
  const { attachments, remove } = useAttachmentsStore();
  
  if (mode === 'compact') {
    // Compact mode shows add button and count
    return (
      <div className="flex items-center gap-2">
        <FileUploadButton messageCount={messageCount} />
        {attachments.length > 0 && (
          <Badge variant="secondary" className="h-6 px-2 text-xs">
            {attachments.length} file{attachments.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    );
  }

  // Full mode shows individual attachments with previews
  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <AttachmentPreview
          key={attachment.id}
          attachment={attachment}
          onRemove={() => remove(attachment.id)}
        />
      ))}
    </div>
  );
}
```

#### Attachment Processing Pipeline
```typescript
// File upload with type validation and processing
const handleFileUpload = async (files: FileList) => {
  const validFiles = Array.from(files).filter(file => {
    const isValidType = SUPPORTED_FILE_TYPES.includes(file.type);
    const isValidSize = file.size <= MAX_FILE_SIZE;
    
    if (!isValidType) {
      toast.error(`Unsupported file type: ${file.type}`);
      return false;
    }
    
    if (!isValidSize) {
      toast.error(`File too large: ${formatFileSize(file.size)}`);
      return false;
    }
    
    return true;
  });

  for (const file of validFiles) {
    try {
      // Process different file types
      if (file.type.startsWith('image/')) {
        await processImageFile(file);
      } else if (file.type === 'application/pdf') {
        await processPDFFile(file);
      } else {
        await processGenericFile(file);
      }
    } catch (error) {
      console.error(`Failed to process file ${file.name}:`, error);
      toast.error(`Failed to upload ${file.name}`);
    }
  }
};
```

### Image Processing and Optimization

#### HEIC Conversion Support
```typescript
// Convert HEIC images to JPEG for broader compatibility
import heic2any from 'heic2any';

const convertHeicIfNeeded = async (file: File): Promise<File> => {
  if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
    try {
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8,
      }) as Blob;
      
      return new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), {
        type: 'image/jpeg',
      });
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      throw new Error('Failed to convert HEIC image');
    }
  }
  
  return file;
};
```

#### Image Compression and Resizing
```typescript
// Compress images for optimal upload and display
const compressImage = async (file: File, maxWidth = 1920, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate dimensions maintaining aspect ratio
      const { width, height } = calculateDimensions(img.width, img.height, maxWidth);
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Image compression failed'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};
```

## Code Syntax Highlighting with Shiki

### StreamingCodeBlock Component

**File**: `/src/frontend/components/StreamingCodeBlock.tsx`

#### Real-Time Syntax Highlighting

##### Worker-Based Processing
```typescript
// Shiki worker for non-blocking syntax highlighting
const triggerHighlighting = useCallback((code: string, immediate = false) => {
  if (!code.trim()) return;
  
  const effectiveTheme = getEffectiveTheme();
  const worker = getShikiWorker();
  const requestId = `${lang}-${Date.now()}-${Math.random()}`;

  const handleMessage = (event: MessageEvent) => {
    if (event.data.id === requestId) {
      if (event.data.status === 'success') {
        setHighlightedCode(event.data.html);
        
        if (immediate) {
          setShowHighlighted(true); // Immediate for complete code
        } else {
          // Smooth transition for streaming
          requestAnimationFrame(() => {
            setTimeout(() => setShowHighlighted(true), 50);
          });
        }
      }
      worker.removeEventListener('message', handleMessage);
    }
  };

  worker.addEventListener('message', handleMessage);
  worker.postMessage({ 
    code, 
    lang, 
    id: requestId, 
    theme: effectiveTheme === 'dark' ? 'dark' : 'light'
  });
}, [lang, getEffectiveTheme]);
```

##### Streaming-Optimized Rendering
```typescript
// Code stability detection for streaming content
useEffect(() => {
  if (isStreaming && codeString.trim()) {
    // Reset timer on each change
    if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current);
    }
    
    // Consider stable after 1000ms without changes
    stabilityTimerRef.current = setTimeout(() => {
      setIsStable(true);
    }, 1000);
  }

  return () => {
    if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current);
    }
  };
}, [codeString, isStreaming]);

// Trigger highlighting when code stabilizes
useEffect(() => {
  const shouldHighlight = isStable && codeString.trim() && codeString !== prevCodeRef.current;
  
  if (shouldHighlight) {
    triggerHighlighting(codeString, false);
  }
}, [codeString, isStable, triggerHighlighting]);
```

##### Dual-Layer Rendering
```typescript
// Show raw code while highlighting, then transition to highlighted
return (
  <div className="my-4 rounded-lg border overflow-hidden">
    <Codebar lang={lang} codeString={codeString} />
    <div className="p-4 bg-background/50">
      <div className="min-h-[1.5rem] relative">
        {/* Raw code layer */}
        <div className={`transition-opacity duration-300 ${showHighlighted ? 'opacity-0' : 'opacity-100'}`}>
          <pre className="bg-transparent m-0 p-0 overflow-x-auto text-sm font-mono leading-6">
            <code className={`block whitespace-pre ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {codeString}
            </code>
          </pre>
        </div>
        
        {/* Highlighted code layer */}
        {highlightedCode && (
          <div className={`absolute top-0 left-0 right-0 transition-opacity duration-300 ${showHighlighted ? 'opacity-100' : 'opacity-0'} overflow-x-auto`}>
            <div 
              className="[&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0 [&_code]:!text-sm [&_code]:!font-mono"
              dangerouslySetInnerHTML={{ __html: highlightedCode }} 
            />
          </div>
        )}
      </div>
    </div>
  </div>
);
```

### Shiki Worker Implementation

**File**: `/src/frontend/worker/shikiWorker.ts`

#### Worker-Based Syntax Highlighting
```typescript
import { getSingletonHighlighter } from 'shiki/bundle/web';

let highlighter: any = null;
const lightTheme = 'github-light';
const darkTheme = 'material-theme-darker';

async function initializeHighlighter() {
  if (!highlighter) {
    highlighter = await getSingletonHighlighter({
      themes: [lightTheme, darkTheme],
      langs: [], // Load languages on demand
    });
  }
  return highlighter;
}

self.onmessage = async (ev: MessageEvent<WorkerMessage>) => {
  const { code, lang, id, theme } = ev.data;
  
  try {
    const highlighterInstance = await initializeHighlighter();
    const selectedTheme = theme === 'light' ? lightTheme : darkTheme;
    
    // Load language if not available
    let finalLang = lang;
    try {
      if (!highlighterInstance.getLoadedLanguages().includes(finalLang)) {
        await highlighterInstance.loadLanguage(finalLang);
      }
    } catch (langError) {
      finalLang = 'text'; // Fallback to plaintext
    }
    
    const html = highlighterInstance.codeToHtml(code, { 
      lang: finalLang, 
      theme: selectedTheme
    });
    
    self.postMessage({ status: 'success', html, id });
  } catch (error) {
    self.postMessage({ status: 'error', code, id, error: error.message });
  }
};
```

## LaTeX Rendering with KaTeX

### Mathematical Expression Support

#### KaTeX Integration in Markdown
```typescript
// MemoizedMarkdown.tsx - KaTeX support
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

function PureMarkdownRendererBlock({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}
```

#### LaTeX Syntax Support
The system supports both inline and block mathematical expressions:

- **Inline Math**: `$E = mc^2$`
- **Block Math**: 
  ```latex
  $$
  \int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
  $$
  ```

#### Performance Optimization
- KaTeX rendering is cached at the component level
- Math expressions are processed during the markdown parsing phase
- Streaming content defers KaTeX rendering until content stabilizes

## Performance Considerations

### Component Memoization

#### Message Component Optimization
```typescript
const PureMessage = memo(function PureMessage({ /* props */ }) {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return (
    prevProps.threadId === nextProps.threadId &&
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.role === nextProps.message.role &&
    prevProps.message.parts.length === nextProps.message.parts.length &&
    prevProps.message.parts.every((part, index) => {
      const nextPart = nextProps.message.parts[index];
      return part.type === nextPart.type && 
             (part.type === 'text' ? part.text === nextPart.text : true);
    }) &&
    prevProps.isStreaming === nextProps.isStreaming
  );
});
```

### Streaming Optimization

#### Throttled Updates
```typescript
// useChat configuration for smooth streaming
const chatConfig = {
  experimental_throttle: 50, // 50ms throttle for smooth updates
  experimental_prepareRequestBody: prepareRequestBody,
};
```

#### Stable Message Ordering
```typescript
// Deterministic message sorting for consistent UI
allMessages.sort((a, b) => {
  const ta = getTime(a);
  const tb = getTime(b);

  // Primary: by time
  if (ta !== tb) return ta - tb;

  // Secondary: user messages before assistant messages
  if (a.role !== b.role) {
    return a.role === 'user' ? -1 : 1;
  }

  // Tertiary: stable order by ID
  return a.id.localeCompare(b.id);
});
```

### Memory Management

#### Attachment Cleanup
```typescript
// Clean up object URLs to prevent memory leaks
useEffect(() => {
  return () => {
    attachments.forEach(attachment => {
      if (attachment.url && attachment.url.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.url);
      }
    });
  };
}, [attachments]);
```

## Testing Strategies

### Component Testing Patterns

#### Message Component Testing
```typescript
describe('Message Component', () => {
  it('renders user messages with attachments', () => {
    // Test user message rendering with image attachments
  });
  
  it('handles streaming assistant messages', () => {
    // Test streaming message updates
  });
  
  it('supports message editing and regeneration', () => {
    // Test message editing workflow
  });
  
  it('renders code blocks with syntax highlighting', () => {
    // Test Shiki integration
  });
  
  it('handles mobile long press interactions', () => {
    // Test mobile gesture handling
  });
});
```

#### Chat Input Testing
```typescript
describe('ChatInput Component', () => {
  it('handles file drag and drop', () => {
    // Test drag and drop functionality
  });
  
  it('manages draft persistence', () => {
    // Test draft saving and loading
  });
  
  it('supports keyboard shortcuts', () => {
    // Test Enter/Shift+Enter behavior
  });
  
  it('integrates with attachment system', () => {
    // Test attachment upload and display
  });
});
```

The chat components system provides a comprehensive, high-performance foundation for real-time conversational AI interfaces with advanced features like streaming, syntax highlighting, file handling, and mobile optimization.