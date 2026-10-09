/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  compress: false,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    unoptimized: true,
  },

  serverExternalPackages: [
    'firebase-admin',
    'fluent-ffmpeg',
    'ffmpeg-static',
    '@genkit-ai/ai',
    '@genkit-ai/core',
    '@genkit-ai/google-genai',
    'genkit',
    '@google-cloud/firestore',
    '@google-cloud/storage',
  ],

  experimental: {
    allowedDevOrigins: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://172.20.10.4:3000',

      '*.ngrok-free.dev',
      '*.ngrok-free.app',

      '*.cloudworkstations.dev',
      '*.cloudworkstations.googleusercontent.com',
      '*.firebaseapp.com',
      '*.web.app',
    ],
    serverActions: {
      bodySizeLimit: '100mb',
    allowedDevOrigins: [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://172.20.10.4:3000',
  'https://glandular-peddling-corsage.ngrok-free.dev',

        '*.cloudworkstations.dev',
        '*.cloudworkstations.googleusercontent.com',
        '*.firebaseapp.com',
        '*.web.app',
      ],
    },
  },
};

module.exports = nextConfig;