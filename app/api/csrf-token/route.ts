/**
 * CSRF Token endpoint
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/security/csrf';

/**
 * GET /api/csrf-token
 * Generate and return a new CSRF token
 */
export async function GET(request: NextRequest) {
  try {
    const token = generateCSRFToken();
    
    // Set token in cookie
    const response = NextResponse.json({ token });
    
    response.cookies.set('csrf-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Failed to generate CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}