/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  // Optimize development build performance
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  // Reduce bundle size in development
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // TODO: Remove this once ESLint flat config is working properly
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
