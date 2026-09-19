import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '*.ngrok-free.app',
    '*.ngrok-free.dev',
    '*.ngrok.io',
    'unsharped-logiest-miguel.ngrok-free.dev',
  ],
  async rewrites() {
    const targetBackend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5128';
    // Strip trailing slash if present
    const cleanBackend = targetBackend.replace(/\/+$/, '');
    const destinationUrl = cleanBackend.endsWith('/api/v1') 
      ? `${cleanBackend}/:path*` 
      : `${cleanBackend}/api/v1/:path*`;

    return [
      {
        source: '/api/v1/:path*',
        destination: destinationUrl,
      },
    ];
  },
};

export default nextConfig;
