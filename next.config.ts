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
  // Оптимизация для мобильных устройств
  experimental: {
    // Включаем оптимизации для мобильных устройств
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Enable server actions and other optimizations
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Оптимизация изображений
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Оптимизация производительности
  compiler: {
    // Удаляем console.log в продакшене
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Оптимизация бандла
  webpack: (config, { dev, isServer }) => {
    // Оптимизация для мобильных устройств
    if (!dev && !isServer) {
      // Разделяем вендорные библиотеки
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          // Отдельный чанк для Convex
          convex: {
            test: /[\\/]node_modules[\\/]convex[\\/]/,
            name: 'convex',
            chunks: 'all',
            priority: 10,
          },
          // Отдельный чанк для UI компонентов
          ui: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: 5,
          },
        },
      };
      // Оптимизация размера бандла
      config.optimization.minimize = true;
    }

    // Оптимизация для мобильных устройств
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': resolve(__dirname, 'src'),
      '@frontend': resolve(__dirname, 'src/frontend'),
      // Приоритет для мобильных оптимизаций
      'react': 'react',
      'react-dom': 'react-dom',
    };

    return config;
  },

  // Секция headers остается, она нужна для правильной работы Firebase Auth.
  async headers() {
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
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Кэширование для статических ресурсов
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Оптимизация для API
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  // Оптимизация для PWA
  async rewrites() {
    return [
      {
        source: '/sw.js',
        destination: '/_next/static/sw.js',
      },
    ];
  },

  // Эта конфигурация для Turbopack остается, она не мешает.
  turbopack: {
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.css'],
    // Optimize for better module resolution
    resolveAlias: {
      '@': './src',
      '@frontend': './src/frontend',
    },
  },

  eslint: {
    dirs: ['src/app', 'src/components'],
  },

  // Оптимизация для производительности
  poweredByHeader: false,
  compress: true,
  generateEtags: false,

  // Оптимизация для мобильных устройств
  env: {
    // Переменные окружения для оптимизации
    NEXT_PUBLIC_OPTIMIZE_MOBILE: 'true',
    NEXT_PUBLIC_CACHE_DURATION: '600000', // 10 минут
  },
};

export default withPWA(withAnalyzer(nextConfig));
