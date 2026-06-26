/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { formats: ['image/avif', 'image/webp'] },
  // API routes in app/api/ handle proxying to backend
  // API routes in app/api/ handle backend proxying
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
  // Sprint 0 — anciennes URLs landing statique redirigées vers la landing canonique
  async redirects() {
    return [
      { source: '/landingpage.html', destination: '/landing', permanent: true },
      { source: '/landingpage', destination: '/landing', permanent: true },
    ];
  },
};
module.exports = nextConfig;
