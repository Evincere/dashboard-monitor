/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/dashboard-monitor',
  assetPrefix: '/dashboard-monitor',
  webpack: (config) => {
    // Manejar dependencias opcionales como canvas
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['canvas'],
  },
};

module.exports = nextConfig;
