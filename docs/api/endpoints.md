# API Endpoints Documentation

## Overview

Pak.Chat implements a comprehensive REST API through Next.js API routes, providing endpoints for AI model integration, file handling, and real-time communication. All endpoints are designed for high performance with streaming support and proper error handling.

## Next.js API Routes

### Base Configuration

All API routes are configured with:
- **Runtime**: Node.js for development compatibility
- **Timeout**: Extended duration (5 minutes) for AI operations
- **CORS**: Automatic handling through Next.js

## AI Integration Endpoints

### 1. LLM Chat Completion

**Endpoint**: `POST /api/llm`  
**File**: `D:\Desktop\Projects\Pak.Chat\src\app\api\llm\route.ts`  
**Purpose**: Primary AI model integration with streaming support

#### Configuration
```typescript
export const maxDuration = 300;  // 5 minutes
export const runtime = 'nodejs';
```

#### Request Format
```json
{
  "messages": [
    {
      "id": "msg_123",
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "model": "gpt-4o",
  "apiKeys": {
    "openai": "sk-...",
    "google": "AIza...",
    "groq": "gsk_...",
    "openrouter": "sk-or-..."
  },
  "threadId": "j1234567890",
  "userId": "firebase_uid_123",
  "search": false,
  "imageGeneration": {
    "enabled": false,
    "params": {
      "size": "1024x1024",
      "quality": "medium",
      "count": 1,
      "format": "jpeg",
      "compression": 80
    }
  },
  "customMode": {
    "id": "creative",
    "systemPrompt": "You are a creative assistant..."
  },
  "projectId": "j0987654321"
}
```

#### Response Format
```json
{
  "type": "stream",
  "content": "Assistant response text...",
  "model": "gpt-4o",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 75,
    "total_tokens": 225
  }
}
```

#### Implementation Details

**Provider Support** (`line 79-117`):
```typescript
switch (modelConfig.provider) {
  case 'google':
    // Google Gemini with Search Grounding
    if (search) {
      aiModel = createGoogleGenerativeAI({ apiKey })(modelConfig.modelId, {
        useSearchGrounding: true
      });
    } else {
      aiModel = createGoogleGenerativeAI({ apiKey })(modelConfig.modelId);
    }
    break;
  case 'openai':
    // OpenAI with reasoning effort for o1/o3/o4 models
    const openaiConfig = {};
    if (reasoningEffort && ['o4-mini', 'o3'].includes(model)) {
      openaiConfig.reasoningEffort = reasoningEffort;
    }
    aiModel = createOpenAI({ apiKey })(modelConfig.modelId, openaiConfig);
    break;
  case 'openrouter':
    aiModel = createOpenRouter({ apiKey })(modelConfig.modelId);
    break;
  case 'groq':
    // Groq using OpenAI-compatible API
    aiModel = createOpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    })(modelConfig.modelId);
    break;
}
```

**Attachment Processing** (`line 244-333`):
```typescript
// Process different file types
if (mime === 'application/pdf') {
  if (modelConfig.provider === 'google') {
    // Gemini native PDF support
    const base64 = buf.toString('base64');
    content.push({ 
      type: 'image', 
      image: `data:${mime};base64,${base64}` 
    });
  } else {
    // Text extraction for other providers
    const pdfModule = await import('pdf-parse');
    const data = await pdf(buf);
    content.push({ type: 'text', text: `PDF ${attachment.name}:\n${data.text}` });
  }
}

// Handle images
if (mime.startsWith('image/')) {
  if (modelConfig.provider === 'google') {
    content.push({ type: 'image', image: attachment.url });
  } else {
    const base64 = buf.toString('base64');
    content.push({ type: 'image', image: `data:${mime};base64,${base64}` });
  }
}
```

**Project Context Integration** (`line 179-213`):
```typescript
if (projectId && isConvexId(projectId)) {
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
}
```

### 2. Image Generation

**Endpoint**: `POST /api/image-generation`  
**File**: `D:\Desktop\Projects\Pak.Chat\src\app\api\image-generation\route.ts`  
**Purpose**: AI image generation using OpenAI GPT Image models

#### Request Format
```json
{
  "prompt": "A serene mountain landscape at sunset",
  "apiKeys": {
    "openai": "sk-..."
  },
  "userId": "firebase_uid_123",
  "size": "1024x1024",
  "quality": "medium",
  "format": "jpeg",
  "compression": 80
}
```

#### Response Format
```json
{
  "success": true,
  "images": [
    {
      "id": "gpt-image-1234567890-0",
      "result": "data:image/jpeg;base64,/9j/4AAQ...",
      "revisedPrompt": "A serene mountain landscape at sunset"
    }
  ],
  "settings": {
    "model": "gpt-image-1",
    "size": "1024x1024",
    "quality": "medium",
    "count": 1,
    "format": "jpeg",
    "compression": 80
  }
}
```

#### Implementation Details

**User Settings Integration** (`line 52-72`):
```typescript
// Get user's image generation preferences
let userSettings = null;
if (userId) {
  try {
    userSettings = await fetchQuery(api.userSettings.getByFirebaseUid, { 
      firebaseUid: userId 
    });
  } catch (error) {
    console.warn('Failed to fetch user settings:', error);
  }
}

// Use user settings or provided parameters
const imageSize = (size === 'auto' || !size) ? 
  (userSettings?.imageGenerationSize || '1024x1024') : size;
const imageQuality = (quality === 'auto' || !quality) ? 
  (userSettings?.imageGenerationQuality || 'medium') : quality;
const imageFormat = format || userSettings?.imageGenerationFormat || 'jpeg';
const imageCompression = compression || userSettings?.imageGenerationCompression || 80;
```

**OpenAI Responses API Integration** (`line 92-139`):
```typescript
const imageGenerationTool = {
  type: "image_generation",
  size: imageSize === 'auto' ? undefined : imageSize,
  quality: imageQuality === 'auto' ? undefined : 
           imageQuality === 'standard' ? 'medium' : 
           ['low', 'medium', 'high'].includes(imageQuality) ? imageQuality : 'medium',
  output_format: imageFormat,
};

// Add compression for JPEG/WebP
if ((imageFormat === 'jpeg' || imageFormat === 'webp') && imageCompression !== 80) {
  imageGenerationTool.output_compression = imageCompression;
}

const responseParams = {
  model: 'gpt-4.1-mini',
  input: prompt,
  tools: [imageGenerationTool],
};

const response = await fetch(`${baseUrl}/responses`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(responseParams),
});
```

### 3. Google LLM Title Generation

**Endpoint**: `POST /api/llm-google`  
**File**: `D:\Desktop\Projects\Pak.Chat\src\app\api\llm-google\route.ts`  
**Purpose**: Generate chat titles using Google Gemini models

#### Request Format
```json
{
  "prompt": "What is the capital of France?",
  "isTitle": true,
  "messageId": "msg_123",
  "threadId": "j1234567890"
}
```

#### Response Format
```json
{
  "title": "Question about French Capital",
  "isTitle": true,
  "messageId": "msg_123",
  "threadId": "j1234567890"
}
```

#### Implementation Details

**Title Generation Logic** (`line 26-48`):
```typescript
const response = await genAI.models.generateContent({
  model: 'gemini-2.5-flash-lite-preview-06-17',
  contents: [
    {
      role: 'user',
      parts: [{
        text: `You are a title generator. Follow these rules:
- you will generate a short title based on the first message a user begins a conversation with
- ensure it is not more than 80 characters long
- the title should be a summary of the user's message
- you should NOT answer the user's message, you should only generate a summary/title
- do not use quotes or colons

User message: ${prompt}`
      }]
    }
  ],
  config: {
    temperature: 0.7,
    maxOutputTokens: 60,
  }
});
```

**Fallback Strategy** (`line 52-65`):
```typescript
try {
  const title = response.text;
  return NextResponse.json({ title, isTitle, messageId, threadId });
} catch (error) {
  console.error('Title generation error:', error);
  // Fallback: use the first 80 characters of the prompt
  const fallbackTitle = (prompt as string)?.trim().slice(0, 80) || 'New chat';
  
  return NextResponse.json({
    title: fallbackTitle,
    isTitle,
    messageId,
    threadId,
    error: 'Failed to generate title – using fallback',
  });
}
```

### 4. Chat Completion (Alternative)

**Endpoint**: `POST /api/completion`  
**File**: `D:\Desktop\Projects\Pak.Chat\src\app\api\completion\route.ts`  
**Purpose**: Alternative completion endpoint with different configuration

This endpoint provides similar functionality to `/api/llm` but with different optimization and configuration strategies for specific use cases.

### 5. File Access

**Endpoint**: `GET /api/files/[storageId]`  
**File**: `D:\Desktop\Projects\Pak.Chat\src\app\api\files\[storageId]\route.ts`  
**Purpose**: Secure file access with authentication and caching

#### Request Format
```
GET /api/files/kg123456789?download=true
Authorization: Bearer <firebase-token>
```

#### Response
- **Success**: File stream with appropriate MIME type
- **Not Found**: 404 error
- **Unauthorized**: 403 error

#### Implementation Features
- **Authentication**: Firebase token validation
- **Caching**: Browser and CDN caching headers
- **Streaming**: Large file streaming support
- **MIME Detection**: Automatic content type detection

## Error Handling

### Standard Error Responses

```json
{
  "error": "Error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| 400 | Bad Request | Missing required parameters, invalid format |
| 401 | Unauthorized | Missing or invalid API key |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | AI provider error, server malfunction |
| 503 | Service Unavailable | AI provider temporarily unavailable |

### Error Handling Implementation

```typescript
try {
  // API operation
} catch (error) {
  console.error('API Error:', error);
  return new NextResponse(
    JSON.stringify({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }),
    { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}
```

## Security Features

### API Key Management
- **Header-based**: API keys passed in request headers
- **Encryption**: Keys encrypted in transit and at rest
- **Validation**: Server-side API key validation
- **Scoping**: Keys scoped to specific providers

### Rate Limiting
- **Built-in**: Next.js automatic rate limiting
- **Provider Limits**: Respect AI provider rate limits
- **Graceful Degradation**: Proper error messages for rate limit exceeded

### Input Validation
- **Schema Validation**: Zod schemas for request validation
- **Size Limits**: File size and content length limits
- **Sanitization**: Input sanitization for security

### CORS Configuration
- **Automatic**: Next.js automatic CORS handling
- **Origins**: Configured allowed origins
- **Methods**: Specific HTTP methods allowed

## Performance Optimization

### Streaming Support
```typescript
const result = await streamText({
  model: aiModel,
  messages: coreMessages,
  onError: (e) => console.error('AI SDK streamText Error:', e),
  system: buildSystemPrompt(userCustomInstructions),
  abortSignal: req.signal,
});

return result.toDataStreamResponse({
  sendReasoning: true,
  getErrorMessage: (error) => error.message,
});
```

### Caching Strategy
- **Response Caching**: Appropriate cache headers
- **Content Negotiation**: Efficient content delivery
- **CDN Integration**: Global content distribution

### Connection Pooling
- **HTTP/2**: Modern HTTP protocol support
- **Keep-Alive**: Connection reuse
- **Timeout Management**: Proper timeout handling

## Monitoring and Observability

### Logging
```typescript
console.error('API Error:', error);
console.warn('Failed to fetch user settings:', error);
console.log('Processing attachment:', attachment.name);
```

### Metrics
- **Response Time**: Automatic Next.js metrics
- **Error Rate**: Error tracking and reporting
- **Usage Analytics**: Request volume and patterns

### Health Checks
- **Endpoint Status**: Regular health monitoring
- **Provider Status**: AI provider availability checks
- **Database Connectivity**: Convex connection monitoring

---

*This documentation covers all API endpoints as implemented in the Pak.Chat application at D:\Desktop\Projects\Pak.Chat\src\app\api\*