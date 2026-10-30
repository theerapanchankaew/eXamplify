import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Keep the PostgreSQL driver as a plain Node dependency (not bundled).
  serverExternalPackages: ['pg'],
  /* config options here */
  // TypeScript errors fail the build (run `npm run typecheck` locally).
  typescript: {
    ignoreBuildErrors: false,
  },
  // No ESLint config in the repo yet; skip linting during builds until one is added.
  eslint: {
    ignoreDuringBuilds: true,
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
