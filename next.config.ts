const withAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
const withPWA = require('next-pwa')({ dest: 'public', disable: process.env.NODE_ENV === 'development' });

const nextConfig = {
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
module.exports = withPWA(withAnalyzer({
  ...nextConfig,
  
  // This helps Next.js resolve the `target.css` file within `next/font/local`.
  // It ensures that Turbopack can properly resolve CSS files for font optimization.
  turbopack: {
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.css'],
  },
}));
