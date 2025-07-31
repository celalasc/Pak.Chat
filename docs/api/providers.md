# AI Provider Integrations API

This document provides comprehensive details on Pak.Chat's AI provider integrations, including configuration, streaming, error handling, and model-specific features.

## Architecture Overview

Pak.Chat supports multiple AI providers through a unified abstraction layer that handles authentication, streaming, and provider-specific optimizations.

### Supported Providers

| Provider | Models | Features | Base URL |
|----------|---------|----------|-----------|
| **OpenAI** | GPT-4o, GPT-4.1, o3, o4-mini | Reasoning effort, function calling | Default |
| **Google AI** | Gemini 2.5 Pro/Flash | Search grounding, thinking mode | Default |
| **Groq** | Llama 4, Qwen, DeepSeek R1 Distill | High-speed inference | `https://api.groq.com/openai/v1` |
| **OpenRouter** | DeepSeek R1/V3, Various OSS | Model diversity, cost optimization | Default |

## Model Configuration (`/src/lib/models.ts`)

### Model Registry

```typescript
export const AI_MODELS = [
  'Deepseek R1 0528',
  'Deepseek V3', 
  'Gemini 2.5 Pro',
  'Gemini 2.5 Flash',
  'GPT-4o',
  'GPT-4.1-mini',
  'GPT-4.1',
  'GPT-4.1-nano',
  'o4-mini',
  'o3',
  'Meta Llama 4 Scout 17B',
  'Meta Llama 4 Maverick 17B',
  'DeepSeek R1 Distill Llama 70B',
  'Qwen QwQ 32B',
  'Qwen 3 32B',
  'Moonshot AI Kimi K2',
] as const;

export type ModelConfig = {
  modelId: string;
  provider: Provider;
  company: string;
  reasoningEffort?: "medium" | "low" | "high";
};
```

### Provider-Specific Configurations

```typescript
export const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  'Gemini 2.5 Pro': {
    modelId: 'gemini-2.5-pro',
    provider: 'google',
    company: 'Google',
  },
  'o4-mini': {
    modelId: 'o4-mini',
    provider: 'openai',
    company: 'OpenAI',
    reasoningEffort: 'medium', // Reasoning models support
  },
  'Meta Llama 4 Scout 17B': {
    modelId: 'meta-llama/llama-4-scout-17b-16e-instruct',
    provider: 'groq',
    company: 'Groq',
  },
  'Deepseek R1 0528': {
    modelId: 'deepseek/deepseek-r1-0528:free',
    provider: 'openrouter',
    company: 'DeepSeek',
  },
};
```

## Primary Chat API (`/src/app/api/llm/route.ts`)

### Provider Initialization

```typescript
export async function POST(req: NextRequest) {
  const { messages, model, apiKeys, threadId, userId, search, imageGeneration, customMode, projectId } = await req.json();
  
  const modelConfig = getModelConfig(model as AIModel);
  const apiKey = apiKeys[modelConfig.provider];
  const reasoningEffort = modelConfig.reasoningEffort;

  let aiModel;
  
  switch (modelConfig.provider) {
    case 'google':
      // Search Grounding configuration
      if (search) {
        aiModel = createGoogleGenerativeAI({ apiKey })(modelConfig.modelId, {
          useSearchGrounding: true
        });
      } else {
        aiModel = createGoogleGenerativeAI({ apiKey })(modelConfig.modelId);
      }
      break;
      
    case 'openai':
      // Reasoning effort for o1/o3/o4 models
      const openaiConfig: { reasoningEffort?: "low" | "medium" | "high" } = {};
      if (reasoningEffort && ['o4-mini', 'o3'].includes(model)) {
        openaiConfig.reasoningEffort = reasoningEffort;
      }
      aiModel = createOpenAI({ apiKey })(modelConfig.modelId, openaiConfig);
      break;
      
    case 'openrouter':
      aiModel = createOpenRouter({ apiKey })(modelConfig.modelId);
      break;
      
    case 'groq':
      // OpenAI-compatible API with custom base URL
      aiModel = createOpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      })(modelConfig.modelId);
      break;
  }
```

### Advanced Context Loading

```typescript
// Optimized context loading for new vs existing chats
const isNewChat = !threadId || !isConvexId(threadId);
const isFirstMessage = messages.length === 1 && messages[0].role === 'user';

let userCustomInstructions: CustomInstructions | undefined;
let attachments: Attachment[] = [];

// Skip database queries for new chats to optimize performance
if (!isFirstMessage || userId) {
  const settingsPromise = (async () => {
    try {
      let userSettings = null;
      
      if (isNewChat && userId) {
        userSettings = await fetchQuery(api.userSettings.getByFirebaseUid, { firebaseUid: userId });
      } else if (threadId && isConvexId(threadId) && userId) {
        // Parallel queries with fallback strategy
        const [byThread, byUser] = await Promise.allSettled([
          fetchQuery(api.userSettings.getByThreadId, { threadId }),
          fetchQuery(api.userSettings.getByFirebaseUid, { firebaseUid: userId })
        ]);
        
        userSettings = byThread.status === 'fulfilled' && byThread.value 
          ? byThread.value 
          : (byUser.status === 'fulfilled' ? byUser.value : null);
      }
```

### Project Context Integration

```typescript
// Dynamic project context loading
let projectContext = "";
if (projectId && isConvexId(projectId)) {
  try {
    const [project, projectFiles] = await Promise.all([
      fetchQuery(api.projects.get, { projectId }),
      fetchQuery(api.projectFiles.listForAPI, { 
        projectId, 
        paginationOpts: { numItems: 100, cursor: null } 
      })
    ]);

    if (project) {
      projectContext += `\n\n--- Project Context ---`;
      projectContext += `\nProject: ${project.name}`;
      
      if (project.customInstructions) {
        projectContext += `\n\nProject Instructions: ${project.customInstructions}`;
      }

      if (projectFiles?.page && projectFiles.page.length > 0) {
        projectContext += `\n\nProject Files:`;
        projectFiles.page.forEach((file) => {
          projectContext += `\n\n--- File: ${file.name} (${file.fileType}) ---`;
          projectContext += `\n${file.content}`;
          projectContext += `\n--- End of ${file.name} ---`;
        });
      }
    }
  } catch (error) {
    console.error('Failed to fetch project context:', error);
  }
}
```

## Google AI Specialized API (`/src/app/api/llm-google/route.ts`)

### Native Google AI Integration

```typescript
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  const genAI = new GoogleGenAI({ apiKey });
  
  // Advanced generation configuration
  const generationConfig = {
    temperature: 0.9,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
    responseMimeType: 'text/plain',
  };

  // Thinking mode for Flash models
  const thinkingConfig = modelConfig.modelId.includes('flash') ? {
    thinkingConfig: {
      thinkingBudget: -1, // Unlimited thinking budget
    }
  } : {};
```

### Google-Specific Streaming

```typescript
// Native Google AI streaming with reasoning extraction
const response = await genAI.models.generateContentStream(config);

const stream = new ReadableStream({
  async start(controller) {
    try {
      let reasoning = '';
      let isThinking = false;
      
      // AI SDK compatible stream format
      controller.enqueue(encoder.encode('0:""\n'));
      
      for await (const chunk of response) {
        const text = chunk.text;
        if (!text) continue;
        
        // Extract thinking blocks for reasoning models
        if (text.includes('<thinking>')) {
          isThinking = true;
          reasoning += text;
          continue;
        }
        
        if (isThinking && text.includes('</thinking>')) {
          isThinking = false;
          reasoning += text;
          
          // Send reasoning in AI SDK format
          const reasoningData = JSON.stringify({ reasoning });
          controller.enqueue(encoder.encode(`e:${JSON.stringify(reasoningData)}\n`));
          reasoning = '';
          continue;
        }
        
        if (isThinking) {
          reasoning += text;
          continue;
        }
        
        // Send text content
        const textData = JSON.stringify(text);
        controller.enqueue(encoder.encode(`0:${textData}\n`));
      }
      
      // Completion marker
      controller.enqueue(encoder.encode('d:{"finishReason":"stop"}\n'));
      controller.close();
    } catch (error) {
      // Error handling in AI SDK format
      const errorData = JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      controller.enqueue(encoder.encode(`3:"${errorData}"\n`));
      controller.close();
    }
  },
});
```

### Search Grounding Configuration

```typescript
// Google Search integration for Gemini 2.5
const config = {
  model: modelConfig.modelId,
  config: {
    ...generationConfig,
    ...thinkingConfig,
    // Enable Search Grounding
    ...(search && {
      tools: [
        {
          googleSearch: {} // New API replacing deprecated googleSearchRetrieval
        }
      ]
    })
  },
  contents,
  systemInstruction: {
    parts: [{
      text: buildSystemPrompt(userCustomInstructions)
    }]
  }
};
```

## Attachment Processing

### Multi-Format Support

```typescript
const MAX_ATTACHMENT_SIZE_BYTES = 30 * 1024 * 1024; // 30MB limit
const EXTRA_TEXT_MIME_TYPES = new Set([
  'application/json',
  'application/xml', 
  'application/csv',
  'application/x-yaml',
  'application/sql',
]);

for (const attachment of messageAttachments) {
  if (!attachment.url) continue;

  try {
    const res = await fetch(attachment.url);
    if (!res.ok) throw new Error(`Failed to fetch attachment ${attachment.url}`);

    const arrayBuffer = await res.arrayBuffer();
    const sizeBytes = arrayBuffer.byteLength;

    if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
      content.push({
        type: 'text',
        text: `Attachment ${attachment.name} skipped – file size ${(sizeBytes / (1024 * 1024)).toFixed(1)} MB exceeds 30 MB limit.`,
      });
      continue;
    }

    const buf = Buffer.from(arrayBuffer);
    const mime = attachment.type;

    // PDF Processing
    if (mime === 'application/pdf') {
      try {
        if (modelConfig.provider === 'google') {
          // Native PDF support for Gemini
          const base64 = buf.toString('base64');
          content.push({ 
            type: 'image', 
            image: `data:${mime};base64,${base64}` 
          });
        } else {
          // Text extraction for other providers
          const pdfModule = await import('pdf-parse');
          const pdf = pdfModule.default as (data: Buffer) => Promise<{ text: string }>;
          const data = await pdf(buf);
          content.push({ type: 'text', text: `PDF ${attachment.name}:\n${data.text}` });
        }
      } catch (err) {
        console.error('PDF parse failed:', err);
        content.push({ type: 'text', text: `Unable to parse PDF ${attachment.name}.` });
      }
      continue;
    }

    // Text Files
    if (mime.startsWith('text/') || EXTRA_TEXT_MIME_TYPES.has(mime)) {
      const text = buf.toString('utf-8');
      content.push({ type: 'text', text: `${attachment.name}:\n${text}` });
      continue;
    }

    // Images
    if (mime.startsWith('image/')) {
      if (modelConfig.provider === 'google') {
        content.push({ type: 'image', image: attachment.url });
      } else {
        const base64 = buf.toString('base64');
        content.push({ type: 'image', image: `data:${mime};base64,${base64}` });
      }
      continue;
    }

    // Binary Files
    const base64 = buf.toString('base64');
    content.push({
      type: 'text',
      text: `Binary file ${attachment.name} (type ${mime}, ${(sizeBytes / 1024).toFixed(0)} KB) encoded in base64 below:\n${base64}`,
    });
  } catch (err) {
    console.error('Attachment processing failed:', err);
  }
}
```

## Image Generation Integration

### OpenAI DALL-E Integration

```typescript
// Always use OpenAI for image generation regardless of selected model
if (imageGeneration?.enabled) {
  const openAIApiKey = apiKeys.openai;
  
  if (!openAIApiKey) {
    return new NextResponse(
      JSON.stringify({ error: 'OpenAI API key required for image generation' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Dynamic base URL resolution for deployment flexibility
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL
      ? process.env.NEXT_PUBLIC_BASE_URL
      : process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : req.nextUrl.origin;

  // Generate image using dedicated endpoint
  const response = await fetch(`${baseUrl}/api/image-generation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      apiKeys,
      userId,
      size: imageGeneration.params.size === 'auto' ? '1024x1024' : imageGeneration.params.size,
      quality: imageGeneration.params.quality === 'auto' ? 'auto' : 
              imageGeneration.params.quality === 'standard' ? 'medium' :
              imageGeneration.params.quality === 'low' ? 'low' :
              imageGeneration.params.quality === 'high' ? 'high' : 'medium',
      count: imageGeneration.params.count,
      format: imageGeneration.params.format || 'jpeg',
      compression: imageGeneration.params.compression || 80,
    }),
  });

  const imageData = await response.json();

  return new NextResponse(JSON.stringify({
    type: 'image_generation',
    prompt: prompt,
    images: imageData.images,
    params: imageData.settings,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

## Streaming Implementation

### AI SDK Integration

```typescript
const result = await streamText({
  model: aiModel,
  messages: coreMessages,
  onError: (e: unknown) => {
    console.error('AI SDK streamText Error:', e);
  },
  system: buildSystemPrompt(userCustomInstructions, customModePrompt, projectContext),
  abortSignal: req.signal,
});

return result.toDataStreamResponse({
  sendReasoning: true, // Enable reasoning stream for o1/o3 models
  getErrorMessage: (error: unknown) => (error as { message: string }).message,
});
```

### Custom Google AI Streaming

```typescript
// Google AI SDK to AI SDK format conversion
return new Response(stream, {
  headers: {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Vercel-AI-Data-Stream': 'true',
    'Cache-Control': 'no-cache',
  },
});
```

## Error Handling

### Provider-Specific Error Recovery

```typescript
// Comprehensive error handling per provider
export async function POST(req: NextRequest) {
  try {
    // ... provider logic
  } catch (error) {
    console.error('Chat API Error:', error);
    
    // Provider-specific error formatting
    if (error instanceof OpenAIError) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'OpenAI API Error',
          details: error.message,
          code: error.code 
        }),
        { status: error.status || 500 }
      );
    }
    
    if (error instanceof GoogleGenerativeAIError) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Google AI Error',
          details: error.message 
        }),
        { status: 500 }
      );
    }
    
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

### Rate Limiting Handling

```typescript
// Automatic retry with exponential backoff
const retryWithBackoff = async (fn: () => Promise<any>, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};
```

## Performance Optimizations

### 1. Request Optimization

```typescript
// Skip database queries for new chats
const isNewChat = !threadId || !isConvexId(threadId);
const isFirstMessage = messages.length === 1 && messages[0].role === 'user';

if (!isFirstMessage || userId) {
  // Only load settings for existing conversations
  [userCustomInstructions, attachments] = await Promise.all([
    settingsPromise, 
    attachmentsPromise
  ]);
}
```

### 2. Parallel Processing

```typescript
// Parallel attachment processing
const processedMessages: ChatMessage[] = await Promise.all(
  messages.map(async (message) => {
    const messageAttachments = attachments.filter((a) => {
      // Efficient attachment filtering logic
    });

    if (messageAttachments.length === 0) {
      return { role: message.role, content: message.content };
    }

    // Process all attachments in parallel
    const content = await Promise.all(
      messageAttachments.map(processAttachment)
    );

    return {
      role: message.role,
      content: content.length > 1 ? content : message.content,
    };
  })
);
```

### 3. Connection Pooling

```typescript
// Reuse AI SDK clients
const aiClients = {
  openai: new Map<string, OpenAI>(),
  google: new Map<string, GoogleGenerativeAI>(),
  groq: new Map<string, OpenAI>(),
  openrouter: new Map<string, OpenRouter>()
};

const getOrCreateClient = (provider: Provider, apiKey: string) => {
  const clients = aiClients[provider];
  if (!clients.has(apiKey)) {
    clients.set(apiKey, createClient(provider, apiKey));
  }
  return clients.get(apiKey);
};
```

## Model-Specific Features

### 1. OpenAI Reasoning Models (o1, o3, o4)

```typescript
// Reasoning effort configuration
if (reasoningEffort && ['o4-mini', 'o3'].includes(model)) {
  openaiConfig.reasoningEffort = reasoningEffort; // "low" | "medium" | "high"
}

// Reasoning stream handling
return result.toDataStreamResponse({
  sendReasoning: true, // Enable reasoning content stream
  getErrorMessage: (error: unknown) => (error as { message: string }).message,
});
```

### 2. Google Gemini Search Grounding

```typescript
// Search-enhanced generation
if (search) {
  aiModel = createGoogleGenerativeAI({ apiKey })(modelConfig.modelId, {
    useSearchGrounding: true
  });
}

// Native search tool integration
tools: [
  {
    googleSearch: {} // Real-time search capability
  }
]
```

### 3. Groq High-Speed Inference

```typescript
// OpenAI-compatible high-speed inference
aiModel = createOpenAI({
  apiKey,
  baseURL: 'https://api.groq.com/openai/v1',
})(modelConfig.modelId);

// Optimized for fast response times
// Supports: Llama 4, Qwen models, DeepSeek distilled variants
```

### 4. OpenRouter Model Diversity

```typescript
// Access to diverse open-source models
aiModel = createOpenRouter({ apiKey })(modelConfig.modelId);

// Models include:
// - DeepSeek R1 (reasoning)
// - Claude variants
// - Mixtral models
// - Custom fine-tunes
```

## Configuration Examples

### 1. Environment Variables

```env
# Provider API Keys
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AIza...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...

# Service Configuration
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud
NEXT_PUBLIC_BASE_URL=https://pakchat.app
```

### 2. Runtime Configuration

```typescript
// Dynamic provider selection
export const runtime = 'nodejs'; // Use Node.js for development
export const maxDuration = 300;  // 5-minute timeout for long responses

// Edge runtime for production (Vercel)
export const runtime = 'edge';   // Optimized for streaming
```

### 3. Model Selection Logic

```typescript
export const getModelConfig = (modelName: string): ModelConfig => {
  const config = MODEL_CONFIGS[modelName as AIModel] ?? MODEL_CONFIGS[DEFAULT_MODEL];
  return {
    ...config,
    reasoningEffort: config.reasoningEffort ?? 'medium',
  };
};

// Fallback handling
export const DEFAULT_MODEL: AIModel = 'Moonshot AI Kimi K2';
```

## Best Practices

### 1. Provider Selection
- Use OpenAI for reasoning tasks (o1, o3, o4 models)
- Use Google AI for search-enhanced responses
- Use Groq for fast inference on open models
- Use OpenRouter for cost optimization and model diversity

### 2. Error Handling
- Implement provider-specific error recovery
- Use exponential backoff for rate limits
- Provide meaningful error messages to users
- Log errors with appropriate context

### 3. Performance
- Cache AI SDK clients for connection reuse
- Process attachments in parallel
- Skip unnecessary database queries for new chats
- Use streaming for real-time user feedback

### 4. Security
- Validate API keys before requests
- Sanitize user inputs and attachments
- Implement rate limiting per user/IP
- Use secure token storage and rotation

This comprehensive provider integration system enables flexible, performant, and reliable AI model access across multiple providers while maintaining consistent user experience.