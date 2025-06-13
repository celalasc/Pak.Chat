import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import 'katex/dist/katex.min.css';
import { Toaster } from '@/frontend/components/ui/sonner';
import Providers from '@/frontend/components/Providers';

// Register local fonts and expose CSS variables
const proximaVara = localFont({
  src: '../public/fonts/ProximaVara-Regular.woff2',
  variable: '--font-proxima-vara',
  display: 'swap',
});

const berkeleyMono = localFont({
  src: '../public/fonts/BerkeleyMono-Regular.woff2',
  variable: '--font-berkeley-mono',
  display: 'swap',
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${proximaVara.variable} ${berkeleyMono.variable}`}
    >
      <body suppressHydrationWarning={true} className="antialiased font-sans">
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
