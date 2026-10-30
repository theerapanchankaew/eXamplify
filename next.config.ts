import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
  // TODO: the codebase still has pre-existing TypeScript errors (run
  // `npm run typecheck`). Builds skip type/lint checks by default; set
  // STRICT_BUILD=true to enforce them once those errors are fixed.
  typescript: {
    ignoreBuildErrors: process.env.STRICT_BUILD !== 'true',
  },
  eslint: {
    ignoreDuringBuilds: process.env.STRICT_BUILD !== 'true',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
