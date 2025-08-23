import { NextRequest, NextResponse } from 'next/server';

// Vercelの環境変数を明示的に取得
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env['GEMINI_API_KEY'];

// 環境変数チェック用ログ
console.log('⭐ GEMINI_API_KEY 状態チェック:');
console.log('  - 存在:', !!GEMINI_API_KEY);
console.log('  - 長さ:', GEMINI_API_KEY?.length || 0);
console.log('  - プレフィックス:', GEMINI_API_KEY?.substring(0, 7));
console.log('  - NODE_ENV:', process.env.NODE_ENV);
console.log('  - VERCEL_ENV:', process.env.VERCEL_ENV);
console.log('  - 全環境変数キー:', Object.keys(process.env).filter(k => k.includes('GEMINI')).join(', '));

export async function POST(request: NextRequest) {
  console.log('画像解析APIが呼び出されました');
  
  try {
    const { frontImage, backImage } = await request.json();
    console.log('画像データ受信:', { 
      frontImageLength: frontImage?.length || 0, 
      backImageLength: backImage?.length || 0 
    });

    if (!frontImage) {
      console.error('表面画像がありません');
      return NextResponse.json({ error: '画像が必要です' }, { status: 400 });
    }

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      console.error('Gemini API key is not configured properly');
      console.error('Current key:', GEMINI_API_KEY ? `Set (length: ${GEMINI_API_KEY.length})` : 'Not set');
      console.error('Environment:', process.env.NODE_ENV);
      // デモ用のダミーデータを返す
      return NextResponse.json({
        name: '',
        companyName: '',
        title: '',
        emails: [],
        phones: [],
        line_ids: [],
        urls: [],
        other_info: '',
        error: 'API設定エラー: Gemini APIキーが正しく設定されていません'
      });
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

    console.log('Calling Gemini API...');
    console.log('API Key length:', GEMINI_API_KEY.length);
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const requestBody = {
      contents: [{
        parts
      }]
    };
    
    console.log('Request body size:', JSON.stringify(requestBody).length);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error details:');
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Error Body:', errorText);
      
      // エラー内容に基づいた詳細なメッセージ
      let errorMessage = 'Gemini APIエラー';
      if (response.status === 400) {
        errorMessage = 'APIキーが無効です';
      } else if (response.status === 403) {
        errorMessage = 'APIキーのアクセス権がありません';
      } else if (response.status === 429) {
        errorMessage = 'APIの利用制限に達しました';
      }
      
      throw new Error(`${errorMessage}: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // JSONを抽出
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : text;
    
    try {
      const parsedData = JSON.parse(jsonString);
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
    console.error('AI解析エラー詳細:');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'AI解析に失敗しました',
        details: error.message,
        type: error.name
      },
      { status: 500 }
    );
  }
}