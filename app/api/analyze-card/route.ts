import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { frontImage, backImage } = await request.json();

    if (!frontImage) {
      return NextResponse.json({ error: '画像が必要です' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      console.error('Gemini API key is not configured');
      // デモ用のダミーデータを返す
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

    const parts = [
      { 
        text: "この名刺の画像（表と裏）から情報を抽出し、以下のキーを持つJSONオブジェクトとして返してください: name, companyName, title, emails (配列), phones (配列), line_ids (配列), urls (配列), other_info (文字列)。'other_info'キーには、上記のどの項目にも当てはまらないが名刺に記載されている有用な情報（例：キャッチコピー、住所、FAX番号など）をすべて含めてください。情報が見つからない場合は空の文字列または配列にしてください。JSONオブジェクトのみを返してください。" 
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
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
      throw new Error(`Gemini API error: ${response.status}`);
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