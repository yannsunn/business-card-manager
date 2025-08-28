/**
 * CSRF Protection utilities
 */
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// Token configuration
const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_FORM_FIELD = 'csrfToken';
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Store for server-side token validation (in production, use Redis or similar)
const tokenStore = new Map<string, { token: string; expires: number }>();

/**
 * Generate a new CSRF token
 */
export function generateCSRFToken(): string {
  if (typeof window !== 'undefined') {
    // Client-side: Use crypto.getRandomValues
    const array = new Uint8Array(CSRF_TOKEN_LENGTH);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Server-side: Use Node.js crypto
    return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  }
}

/**
 * Create and set CSRF token cookie
 */
export async function setCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const cookieStore = await cookies();
  
  // Set HTTP-only cookie with token
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY / 1000, // Convert to seconds
    path: '/'
  });

  // Store token server-side for validation
  tokenStore.set(token, {
    token,
    expires: Date.now() + TOKEN_EXPIRY
  });

  // Clean up expired tokens periodically
  cleanupExpiredTokens();

  return token;
}

/**
 * Get CSRF token from cookie
 */
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CSRF_COOKIE_NAME);
  return token?.value || null;
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // Skip validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }

  // Get token from cookie
  const cookieToken = await getCSRFToken();
  if (!cookieToken) {
    console.warn('CSRF validation failed: No cookie token');
    return false;
  }

  // Check if token exists and is not expired
  const storedToken = tokenStore.get(cookieToken);
  if (!storedToken || storedToken.expires < Date.now()) {
    console.warn('CSRF validation failed: Token expired or not found');
    return false;
  }

  // Get token from request (header or body)
  let requestToken: string | null = null;

  // Check header first
  requestToken = request.headers.get(CSRF_HEADER_NAME);

  // If not in header, check body (for form submissions)
  if (!requestToken && request.headers.get('content-type')?.includes('application/json')) {
    try {
      const body = await request.clone().json();
      requestToken = body[CSRF_FORM_FIELD] || null;
    } catch {
      // Body parsing failed, continue without body token
    }
  }

  if (!requestToken) {
    console.warn('CSRF validation failed: No request token');
    return false;
  }

  // Compare tokens using constant-time comparison to prevent timing attacks
  const isValid = secureCompare(cookieToken, requestToken);
  
  if (!isValid) {
    console.warn('CSRF validation failed: Token mismatch');
  }

  return isValid;
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Clean up expired tokens from store
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [key, value] of tokenStore.entries()) {
    if (value.expires < now) {
      tokenStore.delete(key);
    }
  }
}

/**
 * Middleware to validate CSRF token
 */
export async function csrfMiddleware(request: NextRequest): Promise<Response | null> {
  // Skip CSRF check for public routes
  const publicRoutes = ['/api/health', '/api/status'];
  if (publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    return null;
  }

  const isValid = await validateCSRFToken(request);
  
  if (!isValid) {
    return new Response(
      JSON.stringify({ error: 'CSRF validation failed' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return null; // Continue to next middleware
}

// Client-side hook moved to separate file

/**
 * Add CSRF token to fetch requests
 */
export function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' 
    ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    : null;

  if (token) {
    options.headers = {
      ...options.headers,
      [CSRF_HEADER_NAME]: token
    };
  }

  return fetch(url, options);
}