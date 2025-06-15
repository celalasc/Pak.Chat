import type { Metadata } from 'next';
// Using generic system fonts to avoid network font downloads during the build
// process. Google-hosted fonts were removed because the build environment
// doesn't allow external network requests.
import './globals.css';
import 'katex/dist/katex.min.css';
import { Toaster } from '@/frontend/components/ui/sonner';
import Providers from '@/frontend/components/Providers';
import AppShellSkeleton from '@/frontend/components/AppShellSkeleton';
import { Suspense } from 'react';
import AuthListener from '@/frontend/components/AuthListener';
import ConvexClientProvider from '@/frontend/components/ConvexClientProvider';
import UserSync from '@/frontend/components/UserSync';

// Use standard web-safe fonts instead of downloading fonts during build
export const dynamic = 'force-dynamic';

// Temporarily commented out due to empty font files
// const proxima = localFont({
//   src: [
//     { path: '../public/fonts/ProximaVara-Regular.woff2', weight: '400' },
//     { path: '../public/fonts/ProximaVara-Semibold.woff2', weight: '600' },
//   ],
//   variable: '--font-sans',
// });

export const metadata: Metadata = {
  title: 'Pak.Chat',
  description: 'High-Performance LLM Application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Allow Firebase auth popup to close when COOP is set */}
        <meta
          httpEquiv="Cross-Origin-Opener-Policy"
          content="same-origin-allow-popups"
        />
      </head>
      <body suppressHydrationWarning className="antialiased font-sans font-mono">
        <Suspense fallback={<AppShellSkeleton />}>
          <Providers>
            <AuthListener />
            <ConvexClientProvider>
              <UserSync />
              {children}
            </ConvexClientProvider>
            <Toaster richColors position="top-right" />
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
