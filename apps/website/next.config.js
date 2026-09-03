/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://*.razorpay.com${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://api.smebuze.com https://*.razorpay.com https://rzp.io https://*.phonepe.com http://localhost:3000",
  "media-src 'self' blob:",
  "connect-src 'self' https://api.smebuze.com https://api.razorpay.com https://lumberjack.razorpay.com https://checkout.razorpay.com https://api-preprod.phonepe.com https://api.phonepe.com https://*.phonepe.com https://accounts.google.com https://oauth2.googleapis.com http://localhost:3000 ws://localhost:3001 http://localhost:3001",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com https://*.phonepe.com https://mercury.phonepe.com https://mercury-uat.phonepe.com",
  "frame-src https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com https://*.phonepe.com",
  "frame-ancestors 'none'",
  "worker-src 'self' blob:",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(self), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'Content-Security-Policy', value: csp },
  ...(!isDev
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/icons/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ];
  },
};

module.exports = nextConfig;
