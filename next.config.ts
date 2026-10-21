import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // alphaTab runs in the browser from public/vendor/alphatab; on the server it is only used by
  // the publish gate (the render round trip), so it must not be bundled into server code.
  serverExternalPackages: ['@coderline/alphatab'],
  // Pages and API routes read generated lessons from content/generated at request time.
  outputFileTracingIncludes: {
    '/**': ['./content/generated/**/*.json'],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/vendor/alphatab/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
