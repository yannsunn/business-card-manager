import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

interface MatchingRequest {
  sourceCard: {
    companyName: string;
    businessContent: string;
    tags: string[];
  };
  targetCards: Array<{
    id: string;
    companyName: string;
    businessContent: string;
    tags: string[];
  }>;
}

interface MatchingResult {
  id: string;
  companyName: string;
  matchScore: number;
  matchReasons: string[];
  potentialCollaboration: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: MatchingRequest = await request.json();
    const { sourceCard, targetCards } = body;

    if (!sourceCard || !targetCards || targetCards.length === 0) {
      return NextResponse.json(
        { error: 'ソースカードとターゲットカードが必要です' },
        { status: 400 }
      );
    }

    // Gemini APIでマッチング分析
    const promptText = `以下の企業間のビジネスマッチングの可能性を分析してください。

【分析元企業】
会社名: ${sourceCard.companyName}
事業内容: ${sourceCard.businessContent || 'なし'}
タグ: ${sourceCard.tags?.join(', ') || 'なし'}

【マッチング候補企業】
${targetCards.map((card, index) => `
${index + 1}. ${card.companyName}
   ID: ${card.id}
   事業内容: ${card.businessContent || 'なし'}
   タグ: ${card.tags?.join(', ') || 'なし'}
`).join('\n')}

各候補企業について、以下の形式でJSONを返してください：
{
  "matches": [
    {
      "id": "企業のID",
      "companyName": "企業名",
      "matchScore": マッチングスコア（0-100の数値）,
      "matchReasons": ["マッチング理由1", "マッチング理由2"],
      "potentialCollaboration": "想定される協業内容"
    }
  ]
}

マッチングスコアの基準：
- 80-100: 非常に高い相乗効果が期待できる
- 60-79: 良好な協業の可能性あり
- 40-59: 特定分野での協業可能
- 20-39: 限定的な協業の可能性
- 0-19: マッチング度が低い

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
      
      // フォールバック: タグベースの簡易マッチング
      const fallbackMatches = targetCards.map(card => {
        const commonTags = card.tags?.filter(tag => 
          sourceCard.tags?.includes(tag)
        ) || [];
        
        const score = Math.min(100, commonTags.length * 20 + 20);
        
        return {
          id: card.id,
          companyName: card.companyName,
          matchScore: score,
          matchReasons: commonTags.length > 0 
            ? [`共通タグ: ${commonTags.join(', ')}`]
            : ['業界が異なる可能性があります'],
          potentialCollaboration: '詳細な分析には追加情報が必要です'
        };
      });
      
      return NextResponse.json({
        matches: fallbackMatches.sort((a, b) => b.matchScore - a.matchScore)
      });
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // JSONを抽出
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
    
    try {
      const parsedData = JSON.parse(jsonString);
      
      // スコアでソート
      if (parsedData.matches) {
        parsedData.matches.sort((a: MatchingResult, b: MatchingResult) => 
          b.matchScore - a.matchScore
        );
      }
      
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      
      // パースエラーの場合もフォールバック
      const fallbackMatches = targetCards.map(card => ({
        id: card.id,
        companyName: card.companyName,
        matchScore: 50,
        matchReasons: ['分析を完了できませんでした'],
        potentialCollaboration: '手動で確認が必要です'
      }));
      
      return NextResponse.json({
        matches: fallbackMatches
      });
    }
  } catch (error) {
    console.error('マッチング分析エラー:', error);
    return NextResponse.json(
      { error: 'マッチング分析に失敗しました' },
      { status: 500 }
    );
  }
}