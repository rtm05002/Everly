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

// Sentry disabled temporarily - uncomment when ready
// Conditionally wrap with Sentry if DSN is configured
let exportConfig = nextConfig
/*
if (process.env.SENTRY_DSN) {
  try {
    const { withSentryConfig } = require('@sentry/nextjs')
    exportConfig = withSentryConfig(nextConfig, { silent: true })
  } catch (e) {
    console.warn('[next.config] Sentry not available:', e.message)
  }
}
*/

module.exports = exportConfig
