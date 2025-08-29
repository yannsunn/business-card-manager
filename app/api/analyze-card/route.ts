import { NextRequest, NextResponse } from 'next/server';
import { BusinessCardError, ErrorCode, fromAPIError, logError, withRetry } from '@/lib/errors';

// API Route設定: ボディサイズ制限を10MBに拡張
export const maxDuration = 30; // 30秒のタイムアウト
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Gemini APIキー - Vercel環境変数から取得、なければデフォルト値
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBQkGb0kc9kgPLqf4ACnlp3MLEmPJqHgto';
  
  console.log('🔍 analyze-card API called');
  
  try {
    // リクエストボディの検証
    let body;
    try {
      body = await request.json();
    } catch {
      throw new BusinessCardError(
        'リクエストデータが不正です',
        ErrorCode.API_INVALID_REQUEST,
        400
      );
    }
    
    const { frontImage, backImage } = body;
    
    // 画像データのサイズを確認
    const frontSize = frontImage ? Math.round(frontImage.length * 0.75 / 1024) : 0;
    const backSize = backImage ? Math.round(backImage.length * 0.75 / 1024) : 0;
    
    
    // サイズ制限チェック（4MBまで）
    if (frontSize > 4096 || backSize > 4096) {
      throw new BusinessCardError(
        '画像サイズが大きすぎます（最大4MBまで）',
        ErrorCode.IMAGE_SIZE_TOO_LARGE,
        413,
        true,
        { frontSize, backSize }
      );
    }

    if (!frontImage) {
      throw new BusinessCardError(
        '表面画像が必要です',
        ErrorCode.API_INVALID_REQUEST,
        400
      );
    }

    if (!GEMINI_API_KEY) {
      console.error('🔴 GEMINI_API_KEY is not configured');
      throw new BusinessCardError(
        'APIキーが設定されていません',
        ErrorCode.API_SERVER_ERROR,
        500,
        false
      );
    }

    const parts = [
      { 
        text: "この名刺の画像（表と裏）から情報を抽出し、以下のキーを持つJSONオブジェクトとして返してください: name（氏名）, companyName（会社名）, title（役職）, emails（メールアドレスの配列）, phones（電話番号の配列）, line_ids（LINE IDの配列）, urls（ウェブサイトURLの配列 - httpやhttpsで始まるURL、またはwwwで始まるドメインを全て含める）, other_info（その他の情報）。特にurls配列には、名刺に記載されているウェブサイト、ホームページ、SNSリンクなど、全てのURL情報を含めてください。QRコードがある場合はその内容も解析してください。情報が見つからない場合は空の文字列または配列にしてください。JSONオブジェクトのみを返してください。" 
      },
      { 
        inlineData: { 
          mimeType: "image/jpeg", 
          data: frontImage 
        } 
      }
    ];

    if (backImage) {
      parts.push({ 
        inlineData: { 
          mimeType: "image/jpeg", 
          data: backImage 
        } 
      });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const requestBody = {
      contents: [{
        parts
      }]
    };
    
    // リトライロジックでAPIコール
    const response = await withRetry(
      () => fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000) // 30秒タイムアウト
      }),
      {
        maxAttempts: 3,
        delay: 2000,
        shouldRetry: (error: any) => {
          // 429（レートリミット）や503（サーバーエラー）の場合リトライ
          const status = error?.status || error?.response?.status;
          return status === 429 || status === 503;
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔴 Gemini API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText.substring(0, 500)
      });
      
      // ステータスコードに基づいたエラーハンドリング
      let errorCode: ErrorCode;
      let errorMessage: string;
      
      switch (response.status) {
        case 400:
          errorCode = ErrorCode.API_INVALID_REQUEST;
          errorMessage = 'APIキーが無効です';
          break;
        case 403:
          errorCode = ErrorCode.AUTH_UNAUTHORIZED;
          errorMessage = 'APIキーのアクセス権がありません';
          break;
        case 429:
          errorCode = ErrorCode.API_RATE_LIMIT;
          errorMessage = 'APIの利用制限に達しました';
          break;
        default:
          errorCode = ErrorCode.API_SERVER_ERROR;
          errorMessage = 'Gemini APIエラー';
      }
      
      throw new BusinessCardError(
        errorMessage,
        errorCode,
        response.status,
        true,
        { errorBody: errorText.substring(0, 500) }
      );
    }

    const result = await response.json();
    console.log('✅ Gemini API Success');
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    console.log('📝 Raw response text:', text.substring(0, 200));
    
    // JSONを抽出
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : text;
    
    try {
      const parsedData = JSON.parse(jsonString);
      console.log('✅ Parsed data successfully');
      return NextResponse.json(parsedData);
    } catch {
      // パースエラーの場合は空のデータを返す
      return NextResponse.json({
        name: '',
        companyName: '',
        title: '',
        emails: [],
        phones: [],
        line_ids: [],
        urls: [],
        other_info: ''
      });
    }
  } catch (error: any) {
    // エラーをログに記録
    const bcError = error instanceof BusinessCardError ? error : fromAPIError(error);
    logError(bcError, { 
      endpoint: '/api/analyze-card'
    });
    
    // クライアントにエラーレスポンスを返す
    return NextResponse.json(
      { 
        error: bcError.message,
        code: bcError.code,
        details: process.env.NODE_ENV === 'development' ? {
          stack: bcError.stack,
          context: bcError.context
        } : undefined
      },
      { status: bcError.statusCode }
    );
  }
}