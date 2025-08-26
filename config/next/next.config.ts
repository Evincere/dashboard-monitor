import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Restore basePath for assets, but configure nginx to handle API rewriting
  basePath: '/dashboard-monitor',
  assetPrefix: '/dashboard-monitor',
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
  // Webpack configuration to handle module resolution issues
  webpack: (config, { dev, isServer }) => {
    // Handle handlebars require.extensions issue
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Ignore problematic modules that cause warnings
    config.ignoreWarnings = [
      /require.extensions is not supported by webpack/,
      /Critical dependency: the request of a dependency is an expression/,
    ];

    // Handle dynamic requires in node_modules
    config.module.rules.push({
      test: /node_modules.*\.js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    // Add externals for server-side only modules
    if (isServer) {
      config.externals = [...(config.externals || []), 'handlebars'];
    }

    return config;
  },
};

export default nextConfig;
