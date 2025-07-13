import type { NextConfig } from "next";
import { withConvex } from "convex/next";

const nextConfig: NextConfig = {
  // Оптимизация для мобильных устройств
  experimental: {
    // Включаем оптимизации для мобильных устройств
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Оптимизация изображений
    images: {
      allowFutureImage: true,
    },
    // Оптимизация шрифтов
    fontLoaders: [
      { loader: '@next/font/google', options: { subsets: ['latin'] } }
    ],
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
  headers() {
    return [
      {
        source: '/(.*)',
        headers: [
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

export default withConvex(nextConfig);
