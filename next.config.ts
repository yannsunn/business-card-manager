import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  swcMinify: true,
  experimental: {
    workerThreads: false,
    cpus: 1
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.firebaseapp.com;
              style-src 'self' 'unsafe-inline' https://*.googleapis.com;
              img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googleusercontent.com;
              font-src 'self' https://*.gstatic.com;
              connect-src 'self' https://*.googleapis.com https://*.google.com https://*.firebaseapp.com https://*.firebaseio.com wss://*.firebaseio.com https://generativelanguage.googleapis.com;
              frame-src 'self' https://*.google.com https://*.firebaseapp.com;
            `.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
          },
        ],
      },
    ];
  },
  poweredByHeader: false,
};

export default nextConfig;
