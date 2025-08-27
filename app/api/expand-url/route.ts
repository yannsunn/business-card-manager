import { NextRequest, NextResponse } from 'next/server';
import { extractNestedUrls, isShortUrl, isRedirectUrl, normalizeUrl } from '@/lib/urlParser';

/**
 * URLを展開してリダイレクト先を取得
 * 短縮URL、リダイレクトURL、ネストされたURLを処理
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URLが必要です' },
        { status: 400 }
      );
    }
    
    const results = {
      originalUrl: url,
      finalUrl: '',
      nestedUrls: [] as string[],
      isShortUrl: isShortUrl(url),
      isRedirectUrl: isRedirectUrl(url),
      redirectChain: [] as string[],
      error: null as string | null
    };
    
    // ネストされたURLを抽出
    results.nestedUrls = extractNestedUrls(url);
    
    // 短縮URLまたはリダイレクトURLの場合、展開を試みる
    if (results.isShortUrl || results.isRedirectUrl) {
      try {
        // HEADリクエストで効率的にリダイレクトを追跡
        let currentUrl = url;
        const maxRedirects = 10;
        let redirectCount = 0;
        
        while (redirectCount < maxRedirects) {
          const response = await fetch(currentUrl, {
            method: 'HEAD',
            redirect: 'manual', // リダイレクトを手動で処理
            signal: AbortSignal.timeout(5000), // 5秒タイムアウト
          });
          
          // リダイレクトがある場合
          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (location) {
              // 相対URLの場合は絶対URLに変換
              const nextUrl = new URL(location, currentUrl).toString();
              results.redirectChain.push(nextUrl);
              currentUrl = nextUrl;
              redirectCount++;
            } else {
              break;
            }
          } else {
            // リダイレクトが終了
            results.finalUrl = currentUrl;
            break;
          }
        }
        
        if (!results.finalUrl && results.redirectChain.length > 0) {
          results.finalUrl = results.redirectChain[results.redirectChain.length - 1];
        }
        
      } catch (error) {
        // 展開に失敗した場合はエラーをログに記録
        console.error('URL展開エラー:', error);
        results.error = 'URLの展開に失敗しました';
        results.finalUrl = url; // オリジナルURLを使用
      }
    } else {
      // 通常のURLの場合は正規化のみ
      results.finalUrl = normalizeUrl(url);
    }
    
    // ネストされたURLからも追加情報を抽出
    for (const nestedUrl of results.nestedUrls) {
      if (isShortUrl(nestedUrl) || isRedirectUrl(nestedUrl)) {
        // ネストされた短縮URLも展開（非同期で並列処理）
        try {
          const response = await fetch(nestedUrl, {
            method: 'HEAD',
            redirect: 'follow',
            signal: AbortSignal.timeout(3000),
          });
          
          if (response.url && response.url !== nestedUrl) {
            results.nestedUrls.push(response.url);
          }
        } catch {
          // エラーは無視
        }
      }
    }
    
    // 重複を削除
    results.nestedUrls = [...new Set(results.nestedUrls)];
    
    return NextResponse.json(results);
    
  } catch (error) {
    console.error('URLエキスパンドエラー:', error);
    return NextResponse.json(
      { error: 'URLの処理に失敗しました' },
      { status: 500 }
    );
  }
}