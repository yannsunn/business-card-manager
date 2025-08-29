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
  // 環境変数を明示的に含める
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
};

module.exports = nextConfig;