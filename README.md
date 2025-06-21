# 🚀 Pak.Chat — High-Performance LLM Client

<div align="center">

**Modern web application for working with multiple AI models**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Convex](https://img.shields.io/badge/Convex-Backend-orange?style=for-the-badge)](https://convex.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-yellow?style=for-the-badge&logo=firebase)](https://firebase.google.com/)

</div>

## 📖 Overview
Pak.Chat is a high-performance Next.js application providing a unified interface for working with multiple language model providers. Supports OpenAI, Google Gemini, Groq, and OpenRouter with real-time capabilities and cross-device synchronization.

## ✨ Key Features

### 🤖 Multi-Provider Support
- **OpenAI**: GPT-4o, GPT-4.1, GPT-4.1-mini, GPT-4.1-nano, o3, o4-mini
- **Google**: Gemini 2.5 Pro, Gemini 2.5 Flash
- **Groq**: Meta Llama 4 Scout/Maverick, DeepSeek R1 Distill, Qwen models
- **OpenRouter**: DeepSeek R1, DeepSeek V3 and other models

### 💬 Advanced Chat Interface
- **Message threads** with attachment support and image previews
- **Message quoting and editing** with change history
- **Chat branching** — create copies from specific messages
- **History search** with content indexing
- **Shareable links** with privacy controls

### 🎨 Personalization
- **Themes**: light/dark with automatic detection
- **Fonts**: Proxima Vara or system for UI, Berkeley Mono for code
- **Model visibility settings** for providers
- **Custom instructions** for AI assistants

### 📱 Cross-Platform
- **PWA support** for native app installation
- **Responsive design** for mobile devices
- **Offline mode** with caching
- **Real-time synchronization** across devices

## 🛠 Technology Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Backend** | Convex (real-time database), Firebase Auth |
| **State Management** | Zustand, SWR for caching |
| **AI Integration** | AI SDK, provider-specific SDKs |
| **UI Components** | Radix UI, Framer Motion, Lucide Icons |
| **Deployment** | Vercel, Cloudflare Workers |

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.17 or higher
- **pnpm** 9.0.0 or higher
- **Git** for repository cloning

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/yourusername/pak-chat.git
cd pak-chat

# Install dependencies
pnpm install
```

### 2. Environment Variables Setup

Copy the environment file and fill in the required values:

```bash
cp .env.example .env.local
```

**Required variables:**

```env
# Convex Configuration (Required)
CONVEX_DEPLOY_KEY=your_convex_deploy_key
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Firebase Configuration (Required for authentication)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Optional: Custom encryption secret (default built-in will be used)
ENCRYPTION_SECRET=your-custom-encryption-secret
```

### 3. Service Configuration

#### 🔥 Firebase (Authentication)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable **Authentication** and configure **Google Sign-in**
4. Copy project configuration to `.env.local`

#### 📡 Convex (Database and Sync)

1. Create account at [Convex](https://convex.dev/)
2. Install Convex CLI: `pnpm add -g convex`
3. Login: `npx convex login`
4. Initialize project: `npx convex dev`
5. Copy URL and deployment key to `.env.local`

#### 🤖 API Keys Setup

API keys are configured **through the app interface** after launch:

**Supported providers:**
- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Google AI**: [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
- **Groq**: [console.groq.com/keys](https://console.groq.com/keys)
- **OpenRouter**: [openrouter.ai/keys](https://openrouter.ai/keys)

### 4. Launch Application

```bash
# Deploy Convex schema
npx convex dev

# Start dev server (in separate terminal)
pnpm dev
```

Application will be available at: **http://localhost:3000**

### 5. Initial Setup

1. **Sign in with Google** account
2. Open **Settings** (gear icon)
3. Go to **"API Keys"** tab
4. Add API keys for desired providers
5. Select preferred model in selector

## 📦 Build Scripts

```bash
# Development with Turbopack
pnpm dev

# Code linting
pnpm lint

# Production build
pnpm build

# Run production server
pnpm start

# Deploy to Cloudflare
pnpm deploy

# Generate icons
pnpm sprite
```

## 🔧 Production Configuration

### Vercel Deployment

1. Connect repository to Vercel
2. Add environment variables in project settings
3. Deployment will happen automatically

### Cloudflare Workers

```bash
# Configure wrangler
wrangler login

# Deploy
pnpm deploy
```

## 🎯 Usage

### Main Features

1. **Model Selection** — click model button to switch providers
2. **File Upload** — use "+" button to attach documents/images  
3. **Text Quoting** — select AI text to quote in next message
4. **Chat Branching** — create new branch from any message
5. **Search** — use chat history search
6. **Settings** — personalize interface and manage API keys

### Keyboard Shortcuts

- `Ctrl/Cmd + Enter` — send message
- `Esc` — cancel quoting
- `Ctrl/Cmd + K` — search chats
- `Ctrl/Cmd + /` — show all shortcuts

## 🚨 Troubleshooting

### Common Issues

**Authentication Error:**
```bash
# Check Firebase configuration
echo $NEXT_PUBLIC_FIREBASE_API_KEY
```

**Convex Errors:**
```bash
# Reset database schema
npx convex dev --reset
```

**API Key Issues:**
- Ensure keys are added through app interface
- Check provider limits and balance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Special thanks to the [chat0](https://github.com/senbo1/chat0) project for providing an excellent foundation for development.