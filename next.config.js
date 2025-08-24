/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/dashboard-monitor',
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  serverExternalPackages: ['mysql2'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        mysql2: false,
      };
    }
    return config;
  }
};

module.exports = nextConfig;
