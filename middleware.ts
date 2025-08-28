/**
 * Simplified middleware - minimal security for testing
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Skip middleware for static files
  if (request.nextUrl.pathname.startsWith('/_next/static')) {
    return NextResponse.next();
  }
  
  const response = NextResponse.next();
  
  // Minimal security headers (removed CSP to avoid blocking)
  response.headers.set('X-Frame-Options', 'SAMEORIGIN'); // Changed from DENY
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  return response;
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