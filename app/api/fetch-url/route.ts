import { NextRequest, NextResponse } from 'next/server';
import { isShortUrl, extractNestedUrls } from '@/lib/urlParser';
import { validateApiKey, validateUrl, sanitizeHtmlContent, urlFetchRateLimiter, getClientIp } from '@/lib/security';
import { URLFetchRequestSchema } from '@/lib/validation/schemas';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIp = getClientIp(request);
    const rateLimitResult = urlFetchRateLimiter.check(clientIp);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `リクエストが多すぎます。${rateLimitResult.retryAfter}秒後に再試行してください` },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    // Runtime validation using Zod
    const parseResult = URLFetchRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: parseResult.error.issues[0].message 
      }, { status: 400 });
    }
    
    const { url } = parseResult.data;

    // Additional security validation
    const urlValidation = validateUrl(url);
    if (!urlValidation.isValid) {
      return NextResponse.json({ error: urlValidation.error }, { status: 400 });
    }

    // Gemini API is now configured in production
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      throw new Error('API configuration error');
    }

    // URLが短縮URLやAPIエンドポイントの場合、展開を試みる
    let finalUrl = url;
    const redirectChain: string[] = [];
    
    // 短縮URLまAPIエンドポイントの場合、リダイレクトを追跡
    if (isShortUrl(url) || url.includes('/api/') || url.includes('/s/')) {
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          redirect: 'manual',
          signal: AbortSignal.timeout(5000),
        });
        
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location) {
            finalUrl = new URL(location, url).toString();
            redirectChain.push(finalUrl);
          }
        }
      } catch {
        // リダイレクト追跡に失敗した場合は元のURLを使用
      }
    }
    
    // 最終的なURLからコンテンツを取得
    let htmlContent = '';
    let contentType = 'text/html';
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const webResponse = await fetch(finalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BusinessCardBot/1.0; +https://business-card-manager.vercel.app)',
          'Accept': 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      contentType = webResponse.headers.get('content-type') || 'text/html';
      
      if (!webResponse.ok) {
        // APIエンドポイントの場合、JSONレスポンスの可能性
        if (webResponse.status === 404 || webResponse.status === 403) {
          throw new Error(`URLにアクセスできません: ${webResponse.status}`);
        }
      }
      
      // JSONレスポンスの場合はJSONを文字列化
      if (contentType.includes('application/json')) {
        const jsonData = await webResponse.json();
        htmlContent = JSON.stringify(jsonData, null, 2);
      } else {
        htmlContent = await webResponse.text();
      }
    } catch (fetchError: any) {
      console.error('URL取得エラー:', fetchError);
      const errorMessage = fetchError.name === 'AbortError' 
        ? 'タイムアウト: URLの取得に時間がかかりすぎました'
        : 'URLからの情報取得に失敗しました';
      
      return NextResponse.json({ 
        error: errorMessage,
        summary: '',
        extractedInfo: {},
        details: fetchError.message
      }, { status: 400 });
    }

    // コンテンツタイプに応じてテキストを抽出
    let textContent = '';
    
    if (contentType.includes('application/json')) {
      // JSONの場合はそのまま使用
      textContent = htmlContent;
    } else {
      // HTMLから主要なテキストを抽出（セキュリティ対策済み）
      const sanitizedHtml = sanitizeHtmlContent(htmlContent);
      textContent = sanitizedHtml
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 10000);
    }
    
    // ネストされたURLも抽出
    const nestedUrls = extractNestedUrls(url);

    // Gemini APIで要約と情報抽出
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
              text: `以下のコンテンツ（ウェブページ、APIレスポンス、またはJSONデータ）から、名刺に関連する可能性のある情報を抽出し、JSONオブジェクトとして返してください。

元のURL: ${url}
最終URL: ${finalUrl}
コンテンツタイプ: ${contentType}
リダイレクトチェーン: ${redirectChain.join(' -> ')}
関連URL: ${nestedUrls.join(', ')}

コンテンツ:
${textContent}

以下の形式でJSONを返してください:
{
  "summary": "ページの要約（100文字以内）",
  "companyName": "会社名（見つかった場合）",
  "businessContent": "事業内容の詳細（見つかった場合、箇条書きで）",
  "personName": "個人名（見つかった場合）",
  "title": "役職（見つかった場合）",
  "address": "住所（見つかった場合）",
  "phone": "電話番号（見つかった場合）",
  "email": "メールアドレス（見つかった場合）",
  "socialMedia": "ソーシャルメディアアカウント（見つかった場合）",
  "additionalInfo": "その他の重要な情報"
}

注意: APIエンドポイントやJSONデータの場合も、含まれる情報を適切に解析してください。
JSONオブジェクトのみを返してください。`
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error for URL fetch:', response.status, errorText);
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