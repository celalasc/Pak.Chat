import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: 'https://YOUR-CONVEX-URL.convex.site/:path*',
      },
      {
        source: '/((?!api/).*)',
        destination: '/static-app-shell',
      },
    ];
  },
};

export default nextConfig;
