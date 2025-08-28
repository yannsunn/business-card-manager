/**
 * Next.js Middleware for security and request processing
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Get client IP from request
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

/**
 * Rate limiting middleware
 */
function checkRateLimit(request: NextRequest): boolean {
  const ip = getClientIp(request);
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 60; // 60 requests per minute
  
  const userLimit = rateLimitStore.get(ip);
  
  if (!userLimit || userLimit.resetTime < now) {
    // Create new rate limit window
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }
  
  if (userLimit.count >= maxRequests) {
    return false;
  }
  
  // Increment count
  userLimit.count++;
  rateLimitStore.set(ip, userLimit);
  
  return true;
}

/**
 * CSRF token validation
 */
async function validateCSRF(request: NextRequest): Promise<boolean> {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }
  
  // Skip for public endpoints and analyze endpoints temporarily
  const publicEndpoints = ['/api/health', '/api/csrf-token', '/api/analyze-card', '/api/analyze-urls'];
  if (publicEndpoints.some(endpoint => request.nextUrl.pathname.startsWith(endpoint))) {
    return true;
  }
  
  const cookieToken = request.cookies.get('csrf-token')?.value;
  const headerToken = request.headers.get('x-csrf-token');
  
  if (!cookieToken || !headerToken) {
    return false;
  }
  
  // Constant-time comparison
  return cookieToken === headerToken;
}

/**
 * Security headers
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://generativelanguage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebase.googleapis.com https://firebaseapp.com wss://*.firebaseio.com https://*.google.com https://*.googleapis.com; " +
    "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://crypto-talon-417715.firebaseapp.com;"
  );
  
  // Other security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}

export async function middleware(request: NextRequest) {
  // Skip middleware for static files
  if (request.nextUrl.pathname.startsWith('/_next/static')) {
    return NextResponse.next();
  }
  
  // Rate limiting check
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (!checkRateLimit(request)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
    
    // CSRF validation for API routes
    const isValidCSRF = await validateCSRF(request);
    if (!isValidCSRF) {
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
    }
  }
  
  // Continue with request
  const response = NextResponse.next();
  
  // Add security headers
  return addSecurityHeaders(response);
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};