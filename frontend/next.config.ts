import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '*.ngrok-free.app',
    '*.ngrok-free.dev',
    '*.ngrok.io',
    'unsharped-logiest-miguel.ngrok-free.dev',
  ],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:5128/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
