import type { Metadata } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';
import { Toaster } from '@/frontend/components/ui/sonner';
import Providers from '@/frontend/components/Providers';
import AppShellSkeleton from '@/frontend/components/AppShellSkeleton';
import { Suspense } from 'react';
import AuthListener from '@/frontend/components/AuthListener';
import ConvexClientProvider from '@/frontend/components/ConvexClientProvider';
import UserSync from '@/frontend/components/UserSync';

export const dynamic = 'force-dynamic';

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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta
          httpEquiv="Cross-Origin-Opener-Policy"
          content="same-origin-allow-popups"
        />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* Устанавливаем класc темы до загрузки React, чтобы избежать мигания света/темноты */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="antialiased font-sans font-mono">
        <Suspense fallback={null}>
          <ConvexClientProvider>
            <Providers>
              <AuthListener>
                <UserSync />
                {children}
              </AuthListener>
            </Providers>
            <Toaster richColors position="top-right" />
          </ConvexClientProvider>
        </Suspense>
      </body>
    </html>
  );
}
