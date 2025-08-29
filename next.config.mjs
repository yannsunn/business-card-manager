/** @type {import('next').NextConfig} */
const nextConfig = {
  // API Routes のボディサイズ制限を10MBに拡張
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  // 実験的な機能でサーバーアクションのボディサイズも拡張
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;