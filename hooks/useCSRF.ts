/**
 * Client-side hook for CSRF protection
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

interface CSRFHookReturn {
  token: string | null;
  isLoading: boolean;
  error: Error | null;
  refreshToken: () => Promise<void>;
  fetchWithCSRF: (url: string, options?: RequestInit) => Promise<Response>;
}

/**
 * Hook to manage CSRF tokens in client components
 */
export function useCSRF(): CSRFHookReturn {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch CSRF token from API
  const fetchToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/csrf-token');
      
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      
      const data = await response.json();
      setToken(data.token);
      
      // Store in meta tag for easy access
      let metaTag = document.querySelector('meta[name="csrf-token"]');
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('name', 'csrf-token');
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', data.token);
      
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch CSRF token:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize token on mount
  useEffect(() => {
    // Check if token exists in meta tag first
    const existingToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    if (existingToken) {
      setToken(existingToken);
      setIsLoading(false);
    } else {
      fetchToken();
    }
  }, [fetchToken]);

  // Refresh token
  const refreshToken = useCallback(async () => {
    await fetchToken();
  }, [fetchToken]);

  // Fetch with CSRF token
  const fetchWithCSRF = useCallback(async (url: string, options: RequestInit = {}) => {
    const currentToken = token || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    if (!currentToken) {
      // Try to fetch token if not available
      await fetchToken();
      const newToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      
      if (!newToken) {
        throw new Error('CSRF token not available');
      }
    }
    
    const headers = new Headers(options.headers);
    headers.set('x-csrf-token', currentToken || '');
    
    return fetch(url, {
      ...options,
      headers
    });
  }, [token, fetchToken]);

  return {
    token,
    isLoading,
    error,
    refreshToken,
    fetchWithCSRF
  };
}

// Higher-order component removed due to JSX in non-TSX file