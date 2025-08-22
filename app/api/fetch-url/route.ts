import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    console.log('URL情報取得リクエスト:', url);

    if (!url) {
      return NextResponse.json({ error: 'URLが必要です' }, { status: 400 });
    }

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      console.error('Gemini API key is not configured');
      return NextResponse.json({ 
        success: false,
        summary: 'APIキーが未設定のため情報を取得できません',
        businessContent: '',
        additionalInfo: ''
      });
    }

    // URLからコンテンツを取得
    let htmlContent = '';
    try {
      const webResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!webResponse.ok) {
        throw new Error(`Failed to fetch URL: ${webResponse.status}`);
      }
      
      htmlContent = await webResponse.text();
    } catch (fetchError) {
      console.error('URL取得エラー:', fetchError);
      return NextResponse.json({ 
        error: 'URLからの情報取得に失敗しました',
        summary: '',
        extractedInfo: {}
      }, { status: 400 });
    }

    // HTMLから主要なテキストを抽出（簡易版）
    const textContent = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000); // 最初の10000文字に制限

    // Gemini APIで要約と情報抽出
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `以下のウェブページの内容から、名刺に関連する可能性のある情報を抽出し、JSONオブジェクトとして返してください。

URL: ${url}

ウェブページの内容:
${textContent}

以下の形式でJSONを返してください:
{
  "summary": "ページの要約（100文字以内）",
  "companyName": "会社名（見つかった場合）",
  "businessContent": "事業内容（見つかった場合）",
  "address": "住所（見つかった場合）",
  "phone": "電話番号（見つかった場合）",
  "email": "メールアドレス（見つかった場合）",
  "additionalInfo": "その他の重要な情報"
}

JSONオブジェクトのみを返してください。`
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // JSONを抽出
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : text;
    
    try {
      const parsedData = JSON.parse(jsonString);
      return NextResponse.json({
        success: true,
        url,
        ...parsedData
      });
    } catch {
      return NextResponse.json({
        success: false,
        url,
        summary: 'ページの解析に失敗しました',
        extractedInfo: {}
      });
    }
  } catch (error) {
    console.error('URL解析エラー:', error);
    return NextResponse.json(
      { error: 'URL解析に失敗しました' },
      { status: 500 }
    );
  }
}