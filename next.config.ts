import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    clientSegmentCache: true,
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  // Disable webpack filesystem cache to work around Next.js 15.x caching bug
  // This will make cold starts slightly slower, but avoids the ENOENT errors
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
