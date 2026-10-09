/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

 allowedDevOrigins: [
  'localhost',
  '127.0.0.1',
  '172.20.10.4',
  'glandular-peddling-corsage.ngrok-free.dev',
],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'imgur.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.firebaseapp.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.web.app',
        pathname: '/**',
      },
    ],
  },

};

module.exports = nextConfig;
