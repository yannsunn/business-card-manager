import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { frontImage, backImage } = await request.json();

    if (!frontImage) {
      return NextResponse.json({ error: '画像が必要です' }, { status: 400 });
    }

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      console.error('Gemini API key is not configured properly');
      console.error('Current key:', GEMINI_API_KEY ? 'Set but may be invalid' : 'Not set');
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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
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
  } catch (error) {
    console.error('AI解析エラー:', error);
    return NextResponse.json(
      { error: 'AI解析に失敗しました' },
      { status: 500 }
    );
  }
}