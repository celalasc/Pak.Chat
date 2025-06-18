# Pak.Chat

Pak.Chat is a high-performance Next.js application that integrates multiple large language models. It supports OpenAI, Google Gemini, Groq, and OpenRouter providers. The project uses Convex for real-time data sync and Firebase for authentication.

## Setup

1. Clone the repository and install dependencies:
   ```bash
   pnpm install
   ```
2. Copy `.env.example` to `.env.local` and fill in the required keys.
3. Run development server:
   ```bash
   pnpm dev
   ```
4. Build for production:
   ```bash
   pnpm build
   ```

## Technologies
- **Next.js** 15
- **React** 19
- **Convex** for backend data
- **Firebase** authentication
- **Tailwind CSS** styling
- **Zustand** state management
- **AI SDK** for model integrations
- **next-pwa** for Progressive Web App

## Key Features
- Multi-provider model selection
- Adjustable reasoning effort for supported models
- Chat threads with attachments and image previews
- Message quoting and editing
- Real-time synchronization across devices
- Shareable chat links
- Light and dark themes with automatic detection
- Favorite models and provider visibility controls
- Search grounding for Gemini models
- Keyboard shortcuts for quick actions
- Settings drawer with API key management
- Web search toggle during conversations
- Mobile-friendly responsive design
- Optimized image rendering using `next/image`

