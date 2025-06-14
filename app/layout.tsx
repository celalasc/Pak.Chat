import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import 'katex/dist/katex.min.css';
import { Toaster } from '@/frontend/components/ui/sonner';
import Providers from '@/frontend/components/Providers';
import AuthListener from '@/frontend/components/AuthListener';
import ConvexClientProvider from '@/frontend/components/ConvexClientProvider';
import UserSync from '@/frontend/components/UserSync';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
      <body
        suppressHydrationWarning={true}
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <Providers>
          <AuthListener />
          <ConvexClientProvider>
            <UserSync />
            {children}
          </ConvexClientProvider>
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
