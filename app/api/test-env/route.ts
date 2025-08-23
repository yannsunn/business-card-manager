import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 環境変数の存在確認
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  const keyLength = process.env.GEMINI_API_KEY?.length || 0;
  
  return NextResponse.json({
    status: 'ok',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    gemini: {
      hasKey: hasGeminiKey,
      keyLength: keyLength,
      keyPrefix: process.env.GEMINI_API_KEY?.substring(0, 10) || 'NOT_SET',
      isDefault: process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE'
    },
    timestamp: new Date().toISOString()
  });
}