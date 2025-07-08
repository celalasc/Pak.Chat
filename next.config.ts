import { createRequire } from 'node:module'
import { resolve } from 'path'

const require = createRequire(import.meta.url)

const withAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
const withPWA = require('next-pwa')({ 
  dest: 'public', 
  disable: process.env.NODE_ENV === 'development', // PWA только в production
  sw: 'sw.js',
  register: false,
  skipWaiting: true,
  fallbacks: {
    document: '/offline',
  },
  publicExcludes: ['!sw.js', '!workbox-*.js'],
  buildExcludes: [
    /middleware-manifest\.json$/,
    /app-build-manifest\.json$/,
    /build-manifest\.json$/,
    /_buildManifest\.js$/,
    /_ssgManifest\.js$/,
    /chunks\/.*\.js$/
  ],
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  disableDevLogs: true,
  mode: 'production',
  clientsClaim: true,
  navigateFallback: '/offline',
  navigateFallbackDenylist: [/^\/_/, /^\/api/, /^\/favicon\.ico$/, /^\/manifest\.webmanifest$/],
  // Дополнительные настройки для стабильности
  scope: '/',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.convex\.cloud\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 часа
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bundle optimization - отключаем проблемные модули
  // modularizeImports: {
  //   'lucide-react': {
  //     transform: 'lucide-react/dist/esm/{{kebabCase member}}',
  //   },
  // },
  
  // Production runtime optimization
  experimental: {
    // Enable server actions and other optimizations
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Optimize for Edge Runtime in production builds
    runtime: process.env.NODE_ENV === 'production' ? 'edge' : 'nodejs',
  },
  
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
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.google.com https://*.googleapis.com https://accounts.google.com;",
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
    // Optimize for better module resolution
    resolveAlias: {
      '@': './src',
      '@frontend': './src/frontend',
    },
  },
  images: {
    domains: ['lh3.googleusercontent.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.convex.cloud',
      },
    ],
  },
  eslint: {
    dirs: ['src/app', 'src/components'],
  },
  webpack(config) {
    config.resolve.alias['@'] = resolve(__dirname, 'src');
    config.resolve.alias['@frontend'] = resolve(__dirname, 'src/frontend');
    return config;
  },
};

export default withPWA(withAnalyzer(nextConfig));
