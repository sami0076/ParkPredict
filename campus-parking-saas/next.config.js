/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_placeholder_key_for_build_only',
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || 'sk_test_placeholder_key_for_build_only',
  },
  experimental: {
    outputFileTracingIgnores: [
      'node_modules/@supabase/**',
    ],
  },
};

module.exports = nextConfig;