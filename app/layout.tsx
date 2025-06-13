import type { Metadata, Viewport } from 'next';
import { inter, jetbrainsMono } from './fonts';
import { cookies } from 'next/headers';
import './globals.css';
import 'katex/dist/katex.min.css';
import { Toaster } from '@/frontend/components/ui/sonner';
import Providers from '@/frontend/components/Providers';


export const metadata: Metadata = {
  title: 'Pak.Chat',
  description: 'High-Performance LLM Application',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Сначала "дожидаемся" получения объекта с куками
  const cookieStore = await cookies();

  // Теперь безопасно вызываем .get() у полученного объекта
  const generalFontCookie = cookieStore.get('general-font')?.value || 'Inter';
  const codeFontCookie = cookieStore.get('code-font')?.value || 'JetBrains Mono';

  const generalFontClass = `font-sans-${generalFontCookie.replace(/\s+/g, '-').toLowerCase()}`;
  const codeFontClass = `font-mono-${codeFontCookie.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} ${generalFontClass} ${codeFontClass}`}
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
