/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // 🔥 IMPORTANT: Dev origin access (ngrok + local + tunnels)
  allowedDevOrigins: [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://172.20.10.4:3000',
  'https://glandular-peddling-corsage.ngrok-free.dev',

    // Microsoft dev tunnels (if you use them)
    'https://*.devtunnels.ms',
  ],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },

  // Server-only packages (keep if you're using them)
  serverExternalPackages: [
    '@genkit-ai/ai',
    '@genkit-ai/core',
    '@genkit-ai/google-genai',
    'genkit',
    'firebase-admin',
    'fluent-ffmpeg',
  ],
};

module.exports = nextConfig;