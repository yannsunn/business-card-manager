/**
 * URL Content Cache
 * In-memory cache for URL content to reduce API calls and improve performance
 */

interface CacheEntry {
  content: string;
  timestamp: number;
  businessContent?: string;
  tags?: string[];
  companyInfo?: any;
}

class URLContentCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly maxSize: number = 100; // Maximum number of entries
  private readonly ttl: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  /**
   * Get cached content for a URL
   */
  get(url: string): CacheEntry | null {
    const entry = this.cache.get(url);
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(url);
      return null;
    }
    
    // Move to end (LRU)
    this.cache.delete(url);
    this.cache.set(url, entry);
    
    return entry;
  }
  
  /**
   * Set cache entry for a URL
   */
  set(url: string, data: Omit<CacheEntry, 'timestamp'>): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(url)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(url, {
      ...data,
      timestamp: Date.now()
    });
  }
  
  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
    };
  }
  
  private hitCount = 0;
  private missCount = 0;
  
  /**
   * Record cache hit
   */
  recordHit(): void {
    this.hitCount++;
  }
  
  /**
   * Record cache miss
   */
  recordMiss(): void {
    this.missCount++;
  }
}

// Create singleton instance
let cacheInstance: URLContentCache | null = null;

export function getURLCache(): URLContentCache {
  if (!cacheInstance) {
    cacheInstance = new URLContentCache();
    
    // Periodic cleanup of expired entries (every hour)
    if (typeof window === 'undefined') { // Only run on server
      setInterval(() => {
        cacheInstance?.clearExpired();
      }, 60 * 60 * 1000);
    }
  }
  
  return cacheInstance;
}

/**
 * Batch cache operations for multiple URLs
 */
export class BatchURLCache {
  private cache = getURLCache();
  
  /**
   * Get multiple URLs from cache
   */
  getMany(urls: string[]): Map<string, CacheEntry | null> {
    const results = new Map<string, CacheEntry | null>();
    
    for (const url of urls) {
      const entry = this.cache.get(url);
      if (entry) {
        this.cache.recordHit();
      } else {
        this.cache.recordMiss();
      }
      results.set(url, entry);
    }
    
    return results;
  }
  
  /**
   * Set multiple URLs in cache
   */
  setMany(entries: Map<string, Omit<CacheEntry, 'timestamp'>>): void {
    for (const [url, data] of entries.entries()) {
      this.cache.set(url, data);
    }
  }
  
  /**
   * Get URLs that are not in cache
   */
  getMissingUrls(urls: string[]): string[] {
    return urls.filter(url => !this.cache.get(url));
  }
}