import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    clientSegmentCache: true,
    serverActions: {
      bodySizeLimit: '10mb'
    }
  }
};

export default nextConfig;
