import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Proxy user sync calls to Convex
        source: '/syncUser',
        destination: 'https://quixotic-beagle-767.convex.site/syncUser',
      },
    ];
  },
};

export default nextConfig;
