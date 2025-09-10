/**
 * URL解析ユーティリティ
 * ネストされたURL、エンコードされたURL、短縮URLなどを処理
 */

/**
 * URLからパラメータ内のURLを抽出
 * 例: https://example.com/redirect?url=https://target.com
 */
export function extractNestedUrls(url: string): string[] {
  const urls: string[] = [];
  
  try {
    const urlObj = new URL(url);
    
    // クエリパラメータをチェック
    urlObj.searchParams.forEach((value) => {
      // URLっぽいパラメータを検出
      if (isUrlLike(value)) {
        // デコードして追加
        const decodedUrl = decodeURIComponent(value);
        urls.push(decodedUrl);
        
        // 再帰的にネストされたURLも確認
        const nestedUrls = extractNestedUrls(decodedUrl);
        urls.push(...nestedUrls);
      }
    });
    
    // パスの中のエンコードされたURLも確認
    const pathSegments = urlObj.pathname.split('/');
    pathSegments.forEach(segment => {
      const decoded = decodeURIComponent(segment);
      if (isUrlLike(decoded)) {
        urls.push(decoded);
      }
    });
    
  } catch (error) {
    // URL解析に失敗した場合は空配列を返す
    console.error('URL解析エラー:', error);
  }
  
  // 重複を削除して返す
  return [...new Set(urls)];
}

/**
 * 文字列がURLらしいかどうかを判定
 */
export function isUrlLike(str: string): boolean {
  // URLパターンのチェック
  const urlPatterns = [
    /^https?:\/\//i,
    /^www\./i,
    /\.(com|org|net|jp|co|io|ai|app|dev)\b/i,
  ];
  
  return urlPatterns.some(pattern => pattern.test(str));
}

/**
 * 短縮URLサービスかどうか判定
 */
export function isShortUrl(url: string): boolean {
  const shortUrlDomains = [
    'bit.ly',
    'tinyurl.com',
    'goo.gl',
    'ow.ly',
    't.co',
    'buff.ly',
    'is.gd',
    'cutt.ly',
    'short.link',
    'rebrand.ly',
    'bl.ink',
    'lnkd.in',
    'youtu.be',
    'forms.gle',
    'docs.google.com/forms'
  ];
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return shortUrlDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * リダイレクトURLかどうか判定
 */
export function isRedirectUrl(url: string): boolean {
  const redirectPatterns = [
    /\/redirect/i,
    /\/r\//i,
    /\/go\//i,
    /\/link/i,
    /\/out/i,
    /[?&](url|link|redirect|target|dest|destination)=/i,
    /\/track/i,
    /\/click/i,
  ];
  
  return redirectPatterns.some(pattern => pattern.test(url));
}

/**
 * URLを正規化（末尾のスラッシュ削除、クエリパラメータ正規化など）
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // プロトコルをhttpsに統一（httpの場合）
    if (urlObj.protocol === 'http:') {
      urlObj.protocol = 'https:';
    }
    
    // www.を削除
    urlObj.hostname = urlObj.hostname.replace(/^www\./, '');
    
    // 末尾のスラッシュを削除（ルートパス以外）
    if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    
    // トラッキングパラメータを削除
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'dclid', 'msclkid',
      'mc_cid', 'mc_eid',
    ];
    
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * 複数のURLパターンからURLを抽出
 * テキストからURL、メールアドレス、ソーシャルメディアハンドルなどを抽出
 */
export function extractAllUrls(text: string): {
  urls: string[];
  emails: string[];
  socialHandles: { platform: string; handle: string }[];
} {
  const urls: string[] = [];
  const emails: string[] = [];
  const socialHandles: { platform: string; handle: string }[] = [];
  
  // URL抽出（改良版）
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi;
  const urlMatches = text.match(urlRegex) || [];
  urls.push(...urlMatches);
  
  // メールアドレス抽出
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatches = text.match(emailRegex) || [];
  emails.push(...emailMatches);
  
  // ソーシャルメディアハンドル抽出
  const socialPatterns = [
    { platform: 'Twitter/X', regex: /@[a-zA-Z0-9_]{1,15}/g },
    { platform: 'Instagram', regex: /(?:instagram\.com\/|@)([a-zA-Z0-9_.]+)/gi },
    { platform: 'LinkedIn', regex: /linkedin\.com\/in\/([a-zA-Z0-9-]+)/gi },
    { platform: 'GitHub', regex: /github\.com\/([a-zA-Z0-9-]+)/gi },
    { platform: 'Facebook', regex: /facebook\.com\/([a-zA-Z0-9.]+)/gi },
  ];
  
  socialPatterns.forEach(({ platform, regex }) => {
    const matches = text.match(regex) || [];
    matches.forEach(match => {
      socialHandles.push({ platform, handle: match });
    });
  });
  
  // ネストされたURLも確認
  urls.forEach(url => {
    const nested = extractNestedUrls(url);
    urls.push(...nested);
  });
  
  return {
    urls: [...new Set(urls)], // 重複削除
    emails: [...new Set(emails)],
    socialHandles
  };
}

/**
 * QRコードの内容からURLやその他の情報を抽出
 */
export function parseQRContent(content: string): {
  type: 'url' | 'email' | 'phone' | 'text' | 'vcard';
  data: any;
} {
  // URL
  if (isUrlLike(content)) {
    return {
      type: 'url',
      data: content
    };
  }
  
  // メールアドレス
  if (content.startsWith('mailto:') || content.includes('@')) {
    return {
      type: 'email',
      data: content.replace('mailto:', '')
    };
  }
  
  // 電話番号
  if (content.startsWith('tel:') || /^[\d\-\+\(\)]+$/.test(content)) {
    return {
      type: 'phone',
      data: content.replace('tel:', '')
    };
  }
  
  // vCard
  if (content.includes('BEGIN:VCARD')) {
    return {
      type: 'vcard',
      data: parseVCard(content)
    };
  }
  
  // その他のテキスト
  return {
    type: 'text',
    data: content
  };
}

/**
 * vCard形式のパース（簡易版）
 */
function parseVCard(vcard: string): any {
  const lines = vcard.split('\n');
  const result: any = {};
  
  lines.forEach(line => {
    if (line.startsWith('FN:')) result.name = line.substring(3);
    if (line.startsWith('ORG:')) result.organization = line.substring(4);
    if (line.startsWith('TEL:')) result.phone = line.substring(4);
    if (line.startsWith('EMAIL:')) result.email = line.substring(6);
    if (line.startsWith('URL:')) result.url = line.substring(4);
  });
  
  return result;
}