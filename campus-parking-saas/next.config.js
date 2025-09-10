/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    outputFileTracingIgnores: [
      'node_modules/@supabase/**',
    ],
  },
};

module.exports = nextConfig;