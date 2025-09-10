/**
 * レート制限実装
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 定期的に期限切れのエントリをクリーンアップ
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // 1分ごと
  }

  /**
   * レート制限チェック
   */
  check(
    identifier: string,
    options: {
      windowMs?: number;
      maxRequests?: number;
    } = {}
  ): { allowed: boolean; retryAfter?: number } {
    const { windowMs = 60000, maxRequests = 60 } = options; // デフォルト: 1分間に60リクエスト
    const now = Date.now();
    
    // 既存のレート制限情報を取得
    const existing = this.store[identifier];
    
    // 新規または期限切れの場合
    if (!existing || existing.resetTime <= now) {
      this.store[identifier] = {
        count: 1,
        resetTime: now + windowMs
      };
      return { allowed: true };
    }
    
    // リクエスト数をチェック
    if (existing.count >= maxRequests) {
      const retryAfter = Math.ceil((existing.resetTime - now) / 1000);
      return { 
        allowed: false, 
        retryAfter 
      };
    }
    
    // カウントを増やして許可
    existing.count++;
    return { allowed: true };
  }

  /**
   * 特定の識別子のレート制限をリセット
   */
  reset(identifier: string): void {
    delete this.store[identifier];
  }

  /**
   * 期限切れエントリのクリーンアップ
   */
  private cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    }
  }

  /**
   * クリーンアップインターバルの停止
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// シングルトンインスタンス
const rateLimiter = new RateLimiter();

/**
 * API用レート制限設定
 */
export const apiRateLimits = {
  // 一般API
  default: { windowMs: 60000, maxRequests: 60 }, // 1分間に60リクエスト
  
  // 認証関連
  auth: { windowMs: 300000, maxRequests: 10 }, // 5分間に10リクエスト
  
  // データ取得
  fetch: { windowMs: 60000, maxRequests: 100 }, // 1分間に100リクエスト
  
  // データ書き込み
  write: { windowMs: 60000, maxRequests: 30 }, // 1分間に30リクエスト
  
  // AI処理（高コスト）
  ai: { windowMs: 60000, maxRequests: 10 }, // 1分間に10リクエスト
  
  // ファイルアップロード
  upload: { windowMs: 300000, maxRequests: 20 }, // 5分間に20ファイル
};

/**
 * レート制限ミドルウェア for Next.js API Routes
 */
export function withRateLimit(
  handler: (req: any, res: any) => Promise<any>,
  options: {
    windowMs?: number;
    maxRequests?: number;
    identifier?: (req: any) => string;
    skipSuccessfulRequests?: boolean;
    message?: string;
  } = {}
) {
  return async (req: any, res: any) => {
    const {
      windowMs = 60000,
      maxRequests = 60,
      identifier = (req: any) => req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
      skipSuccessfulRequests = false,
      message = 'リクエストが多すぎます。しばらく待ってから再試行してください。'
    } = options;

    const id = typeof identifier === 'function' ? identifier(req) : identifier;
    const rateLimitId = `${req.url}:${id}`;
    
    const { allowed, retryAfter } = rateLimiter.check(rateLimitId, {
      windowMs,
      maxRequests
    });

    if (!allowed) {
      res.setHeader('Retry-After', retryAfter!);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + retryAfter! * 1000).toISOString());
      
      return res.status(429).json({
        error: message,
        retryAfter
      });
    }

    // レート制限ヘッダーを設定
    const remaining = maxRequests - (rateLimiter as any).store[rateLimitId].count;
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));

    // ハンドラーを実行
    const result = await handler(req, res);
    
    // 成功したリクエストをスキップする場合
    if (skipSuccessfulRequests && res.statusCode < 400) {
      rateLimiter.reset(rateLimitId);
    }
    
    return result;
  };
}

/**
 * IPアドレスベースのレート制限チェック
 */
export function checkRateLimit(
  ip: string,
  endpoint: string,
  limits = apiRateLimits.default
): { allowed: boolean; retryAfter?: number; headers: Record<string, string> } {
  const identifier = `${endpoint}:${ip}`;
  const result = rateLimiter.check(identifier, limits);
  
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': limits.maxRequests.toString(),
    'X-RateLimit-Window': (limits.windowMs / 1000).toString(),
  };
  
  if (!result.allowed) {
    headers['Retry-After'] = result.retryAfter!.toString();
    headers['X-RateLimit-Remaining'] = '0';
    headers['X-RateLimit-Reset'] = new Date(Date.now() + result.retryAfter! * 1000).toISOString();
  } else {
    const remaining = limits.maxRequests - ((rateLimiter as any).store[identifier]?.count || 0);
    headers['X-RateLimit-Remaining'] = Math.max(0, remaining).toString();
  }
  
  return { ...result, headers };
}

export default rateLimiter;