import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
  async rewrites() {
    return [
      {
        // Proxy user sync calls to Convex
        source: '/syncUser',
        destination: 'https://quixotic-beagle-767.convex.site/syncUser',
      },
      {
        // Catch-all rule forwarding everything else to the React SPA shell.
        // Excludes Next.js API routes, static assets and favicon requests.
        source: '/((?!api/|syncUser|_next/static|_next/image|favicon.ico).*)',
        destination: '/static-app-shell',
      },
    ];
  },
};

export default nextConfig;
