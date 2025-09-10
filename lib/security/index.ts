/**
 * Security utilities for the business card management system
 */

// レート制限のエクスポート
export { 
  withRateLimit, 
  checkRateLimit, 
  apiRateLimits 
} from './rateLimit';

/**
 * Validate API key
 */
export function validateApiKey(apiKey: string | undefined): boolean {
  if (!apiKey) return false;
  if (apiKey === 'YOUR_GEMINI_API_KEY_HERE') return false;
  if (apiKey.length < 10) return false;
  // Check for valid API key format (alphanumeric with possible dashes/underscores)
  const apiKeyPattern = /^[A-Za-z0-9_-]{10,}$/;
  return apiKeyPattern.test(apiKey);
}

/**
 * Validate URL for security
 */
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const urlObj = new URL(url);
    
    // Check protocol
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return { isValid: false, error: '許可されていないプロトコルです' };
    }
    
    // Block localhost and private IPs
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '[::1]',
    ];
    
    // Check for blocked hosts
    if (blockedHosts.includes(urlObj.hostname.toLowerCase())) {
      return { isValid: false, error: 'ローカルホストへのアクセスは禁止されています' };
    }
    
    // Check for private IP ranges
    const privateIPRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
    if (privateIPRegex.test(urlObj.hostname)) {
      return { isValid: false, error: 'プライベートIPへのアクセスは禁止されています' };
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /file:\/\//i,
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        return { isValid: false, error: '不正なURLパターンが検出されました' };
      }
    }
    
    // Limit URL length
    if (url.length > 2048) {
      return { isValid: false, error: 'URLが長すぎます' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: '無効なURL形式です' };
  }
}

/**
 * Sanitize HTML content
 */
export function sanitizeHtmlContent(content: string): string {
  // Remove script tags and their content
  content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove style tags and their content
  content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove iframe tags
  content = content.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  
  // Remove on* event handlers
  content = content.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocol
  content = content.replace(/javascript:/gi, '');
  
  // Remove data: protocol in src attributes
  content = content.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""');
  
  return content;
}

/**
 * Rate limiter implementation
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  
  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }
  
  check(identifier: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Filter out old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      const oldestRequest = validRequests[0];
      const retryAfter = Math.ceil((oldestRequest + this.windowMs - now) / 1000);
      return { allowed: false, retryAfter };
    }
    
    // Add the new request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return { allowed: true };
  }
  
  private cleanup() {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

// Create singleton instances
export const apiRateLimiter = new RateLimiter(60000, 20); // 20 requests per minute
export const urlFetchRateLimiter = new RateLimiter(60000, 10); // 10 requests per minute

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback to a default identifier
  return 'unknown';
}

/**
 * Validate array size to prevent memory issues
 */
export function validateArraySize<T>(array: T[], maxSize: number, fieldName: string): void {
  if (array.length > maxSize) {
    throw new Error(`${fieldName}の数が上限（${maxSize}）を超えています`);
  }
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: string | undefined,
  maxLength: number,
  fieldName: string
): void {
  if (value && value.length > maxLength) {
    throw new Error(`${fieldName}が長すぎます（最大${maxLength}文字）`);
  }
}