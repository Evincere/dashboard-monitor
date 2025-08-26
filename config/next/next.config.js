/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/dashboard-monitor',
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  serverExternalPackages: ['mysql2', 'canvas', 'pdfjs-dist'],
  
  // FIXED: Enhanced CSP headers to support react-pdf workers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development' 
              ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; connect-src 'self' https: wss: blob: data:; worker-src blob: 'self'; frame-src blob: 'self'; object-src 'none';"
              : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; connect-src 'self' https: blob:; worker-src 'self'; frame-src 'self'; object-src 'none';"
          },
          // Remove conflicting X-Frame-Options header
          {
            key: 'X-Frame-Options',
            value: ''
          },
        ],
      },
    ];
  },
  
  webpack: (config, { isServer }) => {
    // Client-side fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        mysql2: false,
      };
    }
    
    // Fix for react-pdf and handlebars warnings
    config.resolve.alias = {
      ...config.resolve.alias,
      // Fix handlebars warning
      'handlebars': 'handlebars/dist/handlebars.min.js',
    };
    
    // Ignore specific warnings
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /require\.extensions/,
      /Can't resolve '@opentelemetry\/winston-transport'/,
      /Critical dependency: the request of a dependency is an expression/,
    ];
    
    // External packages for server-side
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        'canvas', // react-pdf canvas dependency
        'pdfjs-dist/webpack', // pdfjs webpack specific
      ];
    }
    
    return config;
  },
};

module.exports = nextConfig;
