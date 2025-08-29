import { NextRequest, NextResponse } from 'next/server';
import { BusinessCardError, ErrorCode, logError, withRetry } from '@/lib/errors';

// API Route設定: ボディサイズ制限を10MBに拡張
export const maxDuration = 30; // 30秒のタイムアウト
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('🔍 analyze-card API called');
  console.log('🔍 Environment variables:', {
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    openAILength: process.env.OPENAI_API_KEY?.length,
    hasGemini: !!process.env.GEMINI_API_KEY
  });
  
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
    
    if (!frontImage) {
      throw new BusinessCardError(
        '表面画像が必要です',
        ErrorCode.API_INVALID_REQUEST,
        400
      );
    }

    // OpenAI Vision APIを使用 - 強制的に有効化
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-proj-wMFvzOJqGb9kgPLqf4ACnlp3MLEmPJqH';
    
    // OpenAIが利用可能か確認
    if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 20) {
      console.log('Using Google Cloud Vision API fallback');
      return await analyzeWithGoogleVision(frontImage, backImage);
    }

    // OpenAI Vision API呼び出し
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "この名刺の画像から情報を抽出し、以下のキーを持つJSONオブジェクトとして返してください: name（氏名）, companyName（会社名）, title（役職）, emails（メールアドレスの配列）, phones（電話番号の配列）, line_ids（LINE IDの配列）, urls（ウェブサイトURLの配列）, other_info（その他の情報）。JSONオブジェクトのみを返してください。"
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${frontImage}`
            }
          }
        ]
      }
    ];

    if (backImage) {
      messages[0].content.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${backImage}`
        }
      });
    }

    const response = await withRetry(
      () => fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: messages,
          max_tokens: 1000
        }),
        signal: AbortSignal.timeout(30000)
      }),
      {
        maxAttempts: 3,
        delay: 2000
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔴 OpenAI API Error:', errorText);
      
      // OpenAIが失敗した場合、Google Cloud Visionにフォールバック
      return await analyzeWithGoogleVision(frontImage, backImage);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '{}';
    
    // JSONを抽出
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    
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
    logError(error);
    return NextResponse.json(
      { 
        error: error.message || 'AI解析に失敗しました',
        code: error.code || ErrorCode.API_SERVER_ERROR
      },
      { status: error.statusCode || 500 }
    );
  }
}

// Google Cloud Vision APIフォールバック（無料のOCR）
async function analyzeWithGoogleVision(frontImage: string, backImage: string | null) {
  try {
    // Google Cloud Vision API（TEXT_DETECTION）
    const API_KEY = process.env.GOOGLE_CLOUD_API_KEY || process.env.GEMINI_API_KEY || 'AIzaSyBQkGb0kc9kgPLqf4ACnlp3MLEmPJqHgto';
    
    const requests = [
      {
        image: { content: frontImage },
        features: [{ type: "TEXT_DETECTION", maxResults: 1 }]
      }
    ];

    if (backImage) {
      requests.push({
        image: { content: backImage },
        features: [{ type: "TEXT_DETECTION", maxResults: 1 }]
      });
    }

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests })
      }
    );

    if (!response.ok) {
      throw new Error('Google Vision API failed');
    }

    const result = await response.json();
    const texts = result.responses?.map((r: any) => r.fullTextAnnotation?.text || '').join('\n');
    
    // テキストから情報を抽出（シンプルなパターンマッチング）
    const extractedData = extractInfoFromText(texts);
    
    return NextResponse.json(extractedData);
  } catch (error) {
    console.error('Google Vision API error:', error);
    
    // 最終フォールバック：空のデータを返す
    return NextResponse.json({
      name: '',
      companyName: '',
      title: '',
      emails: [],
      phones: [],
      line_ids: [],
      urls: [],
      other_info: '',
      error: 'OCR処理に失敗しました。手動で入力してください。'
    });
  }
}

// テキストから情報を抽出
function extractInfoFromText(text: string) {
  const data = {
    name: '',
    companyName: '',
    title: '',
    emails: [] as string[],
    phones: [] as string[],
    line_ids: [] as string[],
    urls: [] as string[],
    other_info: ''
  };

  if (!text) return data;

  // メールアドレス抽出
  const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (emailMatches) data.emails = emailMatches;

  // 電話番号抽出
  const phoneMatches = text.match(/(?:\+81|0)\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{4}/g);
  if (phoneMatches) data.phones = phoneMatches.map(p => p.replace(/[-.\s]/g, ''));

  // URL抽出
  const urlMatches = text.match(/https?:\/\/[^\s]+|www\.[^\s]+/g);
  if (urlMatches) data.urls = urlMatches;

  // LINE ID抽出
  const lineMatches = text.match(/LINE[\s:]?@?[\w-]+/gi);
  if (lineMatches) data.line_ids = lineMatches.map(l => l.replace(/LINE[\s:]?/i, ''));

  // 会社名（株式会社、有限会社などを含む行）
  const companyMatch = text.match(/(?:株式会社|有限会社|合同会社|[\w\s]+(?:Corp|Inc|Ltd|Company))[^\n]*/);
  if (companyMatch) data.companyName = companyMatch[0].trim();

  // 残りをother_infoに
  data.other_info = text.substring(0, 500);

  return data;
}