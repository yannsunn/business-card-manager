/**
 * Debounce hook for optimizing search and input operations
 */
import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Debounce a value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounce a callback function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Debounced search hook with loading state
 */
export function useDebouncedSearch<T>(
  searchFn: (term: string) => Promise<T> | T,
  delay: number = 300
): {
  search: (term: string) => void;
  result: T | null;
  isSearching: boolean;
  error: Error | null;
} {
  const [result, setResult] = useState<T | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const debouncedSearch = useDebouncedCallback(async (term: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!term.trim()) {
      setResult(null);
      setIsSearching(false);
      return;
    }

    abortControllerRef.current = new AbortController();
    setIsSearching(true);
    setError(null);

    try {
      const searchResult = await searchFn(term);
      setResult(searchResult);
      setError(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err);
        setResult(null);
      }
    } finally {
      setIsSearching(false);
    }
  }, delay);

  const search = useCallback(
    (term: string) => {
      if (!term.trim()) {
        setResult(null);
        setIsSearching(false);
        setError(null);
        return;
      }
      setIsSearching(true);
      debouncedSearch(term);
    },
    [debouncedSearch]
  );

  return { search, result, isSearching, error };
}