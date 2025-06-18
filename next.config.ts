import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const withAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
const withPWA = require('next-pwa')({ 
  dest: 'public', 
  disable: process.env.NODE_ENV === 'development',
  sw: 'sw.js',
  register: false, // Мы регистрируем SW вручную в layout.tsx
  skipWaiting: true,
  fallbacks: {
    document: '/offline',
  },
  publicExcludes: ['!sw.js'],
  buildExcludes: [/middleware-manifest\.json$/],
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  disableDevLogs: true,
  mode: 'production',
  clientsClaim: true,
  // skipWaiting defined above
  navigateFallback: '/offline',
  navigateFallbackDenylist: [/^\/_/, /^\/api/]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Секция headers остается, она нужна для правильной работы Firebase Auth.
  headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
        ],
      },
    ];
  },
  
  // ВАЖНО: Секция rewrites полностью удалена.
  // Именно она была причиной всех ошибок 404.

  // Эта конфигурация для Turbopack остается, она не мешает.
  turbopack: {
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.css'],
  },
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
};

export default withPWA(withAnalyzer(nextConfig));