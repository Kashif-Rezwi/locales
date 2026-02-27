import type { NextConfig } from 'next';

/**
 * Next.js configuration for the Locales client.
 *
 * - reactStrictMode: double-invokes effects and renders in dev to surface bugs early
 * - images.remotePatterns: allows GitHub avatar images rendered in the UI
 *   (avatars.githubusercontent.com is used for user profile pictures)
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
