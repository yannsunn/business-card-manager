import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000) // 10秒のタイムアウト
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const html = await response.text();
    
    // HTMLから主要なテキストを抽出（簡易版）
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000); // 各URLごとに5000文字に制限
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json();
    console.log('複数URL解析リクエスト:', urls);

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'URLの配列が必要です' }, { status: 400 });
    }

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      console.error('Gemini API key is not configured');
      return NextResponse.json({ 
        success: false,
        businessContent: 'APIキーが未設定のため情報を取得できません',
        summaries: {}
      });
    }

    // 複数URLのコンテンツを並列で取得
    const urlContents = await Promise.all(
      urls.map(async (url) => {
        const content = await fetchUrlContent(url);
        return { url, content };
      })
    );

    // 有効なコンテンツのみフィルタリング
    const validContents = urlContents.filter(({ content }) => content.length > 0);

    if (validContents.length === 0) {
      return NextResponse.json({
        success: false,
        businessContent: '',
        summaries: {},
        error: '全てのURLから情報を取得できませんでした'
      });
    }

    // Gemini APIで統合的な事業内容を生成
    const promptText = `以下は同じ会社の複数のウェブサイトから取得した情報です。
これらの情報を統合して、会社の事業内容を包括的にまとめてください。

${validContents.map(({ url, content }) => `
【URL: ${url}】
${content}
`).join('\n\n')}

以下の形式でJSONを返してください:
{
  "businessContent": "統合された事業内容の説明（重複を排除し、全体像がわかるように200-300文字程度でまとめる）",
  "mainBusiness": "主要事業（箇条書き3-5項目）",
  "summaries": {
    "URL1": "各URLの要約（50文字以内）",
    "URL2": "各URLの要約（50文字以内）"
  },
  "companyInfo": {
    "companyName": "会社名（見つかった場合）",
    "address": "住所（見つかった場合）",
    "phone": "電話番号（見つかった場合）",
    "email": "メールアドレス（見つかった場合）"
  }
}

JSONオブジェクトのみを返してください。`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: promptText
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // JSONを抽出
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : text;
    
    try {
      const parsedData = JSON.parse(jsonString);
      
      // 主要事業を事業内容に追加
      let enhancedBusinessContent = parsedData.businessContent || '';
      if (parsedData.mainBusiness && Array.isArray(parsedData.mainBusiness)) {
        enhancedBusinessContent += '\n\n【主要事業】\n' + parsedData.mainBusiness.map((item: string) => `・${item}`).join('\n');
      }
      
      return NextResponse.json({
        success: true,
        businessContent: enhancedBusinessContent,
        summaries: parsedData.summaries || {},
        companyInfo: parsedData.companyInfo || {},
        urlCount: validContents.length
      });
    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      return NextResponse.json({
        success: false,
        businessContent: '情報の解析に失敗しました',
        summaries: {},
        error: 'JSONパースエラー'
      });
    }
  } catch (error) {
    console.error('複数URL解析エラー:', error);
    return NextResponse.json(
      { error: '複数URL解析に失敗しました' },
      { status: 500 }
    );
  }
}