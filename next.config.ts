import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configuración para subpath (temporarily disabled for testing)
  // basePath: '/dashboard-monitor',
  // assetPrefix: '/dashboard-monitor',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Optimizaciones para memoria limitada
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Configuración para Docker
  output: 'standalone',
  // Reducir el uso de memoria durante el build
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Configuración para servidores con poca memoria
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
