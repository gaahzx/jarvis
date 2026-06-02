/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_API_URL || 'http://191.252.209.43:3001';
const NPM_URL = process.env.NPM_URL || 'http://191.252.209.43:81';

const nextConfig = {
  reactStrictMode: true,
  // output: 'standalone' removido — incompatível com rewrites externos no Vercel
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || BACKEND_URL,
  },
  async rewrites() {
    return [
      // Substitui o serverless proxy — zero CPU na Vercel, roteamento no edge
      {
        source: '/api/proxy/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      // Proxy de upload/download de vídeos (binários grandes, range requests)
      // Mesma mecânica do /api/proxy mas dedicado para a rota /content/upload-video e /content/media
      {
        source: '/api/upload/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      // Nginx Proxy Manager — mesmo benefício
      {
        source: '/api/npm-admin/:path*',
        destination: `${NPM_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
