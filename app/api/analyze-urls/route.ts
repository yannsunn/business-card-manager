import { NextRequest, NextResponse } from 'next/server';
import { extractNestedUrls, isShortUrl, normalizeUrl } from '@/lib/urlParser';
import { validateApiKey, validateUrl, sanitizeHtmlContent, apiRateLimiter, getClientIp, validateArraySize } from '@/lib/security';
import { getURLCache, BatchURLCache } from '@/lib/cache/urlCache';
import { URLsAnalysisRequestSchema } from '@/lib/validation/schemas';
import { withRetry } from '@/lib/utils/retry';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

function generateTags(businessContent: string, _companyInfo?: any): string[] {
  const tags = new Set<string>();
  const content = businessContent.toLowerCase();
  
  // ビジネスカテゴリの判定
  if (content.includes('sns') || content.includes('ソーシャル') || content.includes('マーケティング')) {
    tags.add('SNS運用会社');
  }
  if (content.includes('web') || content.includes('ウェブ') || content.includes('ホームページ')) {
    tags.add('WEB制作');
  }
  if (content.includes('システム') || content.includes('開発') || content.includes('ソフトウェア')) {
    tags.add('システム開発');
  }
  if (content.includes('ai') || content.includes('人工知能') || content.includes('機械学習')) {
    tags.add('AI関連');
  }
  if (content.includes('コンサル') || content.includes('戦略') || content.includes('支援')) {
    tags.add('コンサルティング');
  }
  if (content.includes('デザイン') || content.includes('クリエイティブ')) {
    tags.add('デザイン');
  }
  if (content.includes('教育') || content.includes('研修') || content.includes('トレーニング')) {
    tags.add('教育・研修');
  }
  if (content.includes('不動産') || content.includes('建築') || content.includes('建設')) {
    tags.add('不動産・建築');
  }
  if (content.includes('医療') || content.includes('ヘルスケア') || content.includes('健康')) {
    tags.add('医療・ヘルスケア');
  }
  if (content.includes('金融') || content.includes('投資') || content.includes('保険')) {
    tags.add('金融');
  }
  if (content.includes('ec') || content.includes('通販') || content.includes('eコマース')) {
    tags.add('EC・通販');
  }
  if (content.includes('広告') || content.includes('pr') || content.includes('プロモーション')) {
    tags.add('広告・PR');
  }
  
  return Array.from(tags);
}

async function fetchUrlContent(url: string): Promise<string> {
  // Check cache first
  const cache = getURLCache();
  const cached = cache.get(url);
  if (cached) {
    cache.recordHit();
    return cached.content;
  }
  cache.recordMiss();
  
  try {
    // モバイル対応のタイムアウト設定
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒のタイムアウト
    
    const response = await withRetry(
      () => fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8'
        },
        signal: controller.signal
      }),
      { 
        maxRetries: 2, 
        initialDelay: 500,
        shouldRetry: (error) => {
          // Don't retry if aborted by timeout
          if (error.name === 'AbortError') return false;
          return true;
        }
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const html = await response.text();
    
    // HTMLから主要なテキストを抽出（セキュリティ対策済み）
    const sanitizedHtml = sanitizeHtmlContent(html);
    const content = sanitizedHtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000); // 各URLごとに5000文字に制限
    
    // Cache the content
    cache.set(url, { content });
    
    return content;
  } catch (error: any) {
    console.error(`Failed to fetch ${url}:`, error);
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIp = getClientIp(request);
    const rateLimitResult = apiRateLimiter.check(clientIp);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `リクエストが多すぎます。${rateLimitResult.retryAfter}秒後に再試行してください` },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    // Runtime validation using Zod
    const parseResult = URLsAnalysisRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: parseResult.error.issues[0].message 
      }, { status: 400 });
    }
    
    const { urls } = parseResult.data;

    // Gemini API is now configured in production
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      throw new Error('API configuration error');
    }

    // URLのバリデーション
    const validUrls: string[] = [];
    for (const url of urls) {
      const validation = validateUrl(url);
      if (validation.isValid) {
        validUrls.push(url);
      }
    }

    if (validUrls.length === 0) {
      return NextResponse.json({ error: '有効なURLがありません' }, { status: 400 });
    }

    // ネストされたURLも抽出
    const allUrls = [...validUrls];
    validUrls.forEach(url => {
      const nested = extractNestedUrls(url);
      // ネストされたURLもバリデーション
      nested.forEach(nestedUrl => {
        const validation = validateUrl(nestedUrl);
        if (validation.isValid) {
          allUrls.push(nestedUrl);
        }
      });
    });
    
    // 重複を削除して正規化
    const uniqueUrls = [...new Set(allUrls.map(url => normalizeUrl(url)))];
    
    // 複数URLのコンテンツを並列で取得（最大10件）
    const urlContents = await Promise.all(
      uniqueUrls.slice(0, 10).map(async (url) => {
        // 短縮URLの場合は展開を試みる
        let targetUrl = url;
        if (isShortUrl(url)) {
          try {
            const response = await fetch(url, {
              method: 'HEAD',
              redirect: 'follow',
              signal: AbortSignal.timeout(5000),
            });
            if (response.url && response.url !== url) {
              targetUrl = response.url;
            }
          } catch {
            // 展開に失敗した場合は元のURLを使用
          }
        }
        
        const content = await fetchUrlContent(targetUrl);
        return { 
          url: targetUrl, 
          originalUrl: url !== targetUrl ? url : undefined,
          content 
        };
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
      
      // タグを自動生成
      const tags = generateTags(enhancedBusinessContent, parsedData.companyInfo);
      
      return NextResponse.json({
        success: true,
        businessContent: enhancedBusinessContent,
        summaries: parsedData.summaries || {},
        companyInfo: parsedData.companyInfo || {},
        tags: tags,
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