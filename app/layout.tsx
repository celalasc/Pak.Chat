import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import 'katex/dist/katex.min.css';
import { Toaster } from '@/frontend/components/ui/sonner';
import Providers from '@/frontend/components/Providers';

// Register local fonts and expose CSS variables for dynamic switching
const proximaVara = localFont({
  src: [
    {
      path: '../public/fonts/ProximaVara-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/ProximaVara-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/ProximaVara-Semibold.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-proxima-vara',
  display: 'swap',
});

const berkeleyMono = localFont({
  src: [
     {
      path: '../public/fonts/BerkeleyMono-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/BerkeleyMono-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/BerkeleyMono-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-berkeley-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pak.Chat',
  description: 'High-Performance LLM Application',
};

// Export viewport settings for consistent mobile layout and to prevent zooming
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${proximaVara.variable} ${berkeleyMono.variable}`}
    >
      <body suppressHydrationWarning={true} className="antialiased">
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}