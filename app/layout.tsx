import type { Metadata } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';
import { Toaster } from '@/frontend/components/ui/sonner';
import Providers from '@/frontend/components/Providers';
import { Suspense } from 'react';
import AuthListener from '@/frontend/components/AuthListener';
import ConvexClientProvider from '@/frontend/components/ConvexClientProvider';
import UserSync from '@/frontend/components/UserSync';
import PWAInstallPrompt from '@/frontend/components/PWAInstallPrompt';
import MobileEnhancements from '@/frontend/components/MobileEnhancements';
import ClientScripts from '@/frontend/components/ClientScripts';

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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta
          httpEquiv="Cross-Origin-Opener-Policy"
          content="same-origin-allow-popups"
        />
        <link rel="manifest" href="/manifest.webmanifest" />
        
        {/* PWA и мобильные мета-теги */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Pak.Chat" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Pak.Chat" />
        
        {/* Отключаем зум на двойной тап */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* PWA иконки для iOS */}
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="152x152" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon.ico" />
        
        {/* Полноэкранный режим */}
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Theme initialization script - static to avoid hydration issues */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`
        }} />
      </head>
      <body suppressHydrationWarning className="antialiased font-sans font-mono">
        <ClientScripts />
        <Suspense fallback={null}>
          <ConvexClientProvider>
            <Providers>
              <AuthListener>
                <UserSync />
                {children}
              </AuthListener>
            </Providers>
            <Toaster richColors position="top-right" />
            <PWAInstallPrompt />
            <MobileEnhancements />
          </ConvexClientProvider>
        </Suspense>
      </body>
    </html>
  );
}
