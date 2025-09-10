/**
 * Retry mechanism with exponential backoff
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number, delay: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
};

/**
 * Default retry condition - retry on network errors and 5xx status codes
 */
const defaultShouldRetry = (error: any): boolean => {
  // Network errors
  if (error.name === 'NetworkError' || error.name === 'TypeError') {
    return true;
  }
  
  // Timeout errors
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return true;
  }
  
  // HTTP 5xx errors (server errors)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }
  
  // Rate limiting (HTTP 429)
  if (error.status === 429) {
    return true;
  }
  
  // Don't retry client errors (4xx except 429)
  if (error.status >= 400 && error.status < 500) {
    return false;
  }
  
  // Default to retry for unknown errors
  return true;
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number, 
  initialDelay: number, 
  maxDelay: number, 
  backoffFactor: number
): number {
  // Exponential backoff
  const exponentialDelay = initialDelay * Math.pow(backoffFactor, attempt - 1);
  
  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  
  // Add jitter (±25% randomization)
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  
  return Math.round(cappedDelay + jitter);
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries,
    initialDelay,
    maxDelay,
    backoffFactor,
  } = { ...DEFAULT_OPTIONS, ...options };
  
  const shouldRetry = options.shouldRetry || defaultShouldRetry;
  const onRetry = options.onRetry || (() => {});
  
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if we should retry
      if (attempt > maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }
      
      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, initialDelay, maxDelay, backoffFactor);
      
      // Notify about retry
      onRetry(error, attempt, delay);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Retry decorator for class methods
 */
export function retry(options: RetryOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      return withRetry(
        () => originalMethod.apply(this, args),
        options
      );
    };
    
    return descriptor;
  };
}

/**
 * Create a retryable fetch function
 */
export function createRetryableFetch(
  options: RetryOptions = {}
): typeof fetch {
  return async function retryableFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    return withRetry(
      async () => {
        const response = await fetch(input, init);
        
        // Throw error for non-2xx responses to trigger retry
        if (!response.ok) {
          const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
          error.status = response.status;
          error.response = response;
          throw error;
        }
        
        return response;
      },
      {
        ...options,
        shouldRetry: (error, attempt) => {
          // Use custom shouldRetry if provided
          if (options.shouldRetry) {
            return options.shouldRetry(error, attempt);
          }
          
          // Don't retry if request was aborted by user
          if (init?.signal?.aborted) {
            return false;
          }
          
          return defaultShouldRetry(error);
        },
      }
    );
  };
}

/**
 * Batch retry for multiple operations
 */
export async function batchRetry<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options: RetryOptions & { concurrency?: number } = {}
): Promise<Array<{ item: T; result?: R; error?: any }>> {
  const { concurrency = 3, ...retryOptions } = options;
  const results: Array<{ item: T; result?: R; error?: any }> = [];
  
  // Process items in batches
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    
    const batchResults = await Promise.allSettled(
      batch.map(async item => {
        try {
          const result = await withRetry(
            () => operation(item),
            retryOptions
          );
          return { item, result };
        } catch (error) {
          return { item, error };
        }
      })
    );
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    });
  }
  
  return results;
}