// src/lib/cache-utils.ts

/**
 * Simple in-memory cache utility for API responses
 */

interface CacheEntry {
  data: any;
  timestamp: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private defaultDuration: number;

  constructor(defaultDuration: number = 30 * 1000) { // 30 seconds default
    this.defaultDuration = defaultDuration;
  }

  /**
   * Get cached data if still valid
   */
  get(key: string, duration?: number): any | null {
    const entry = this.cache.get(key);
    const cacheDuration = duration || this.defaultDuration;
    
    if (entry && Date.now() - entry.timestamp < cacheDuration) {
      return entry.data;
    }
    
    // Remove expired entry
    this.cache.delete(key);
    return null;
  }

  /**
   * Set data in cache
   */
  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
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
  getStats(): {
    size: number;
    keys: string[];
    totalMemory: number;
  } {
    const keys = Array.from(this.cache.keys());
    const totalMemory = Array.from(this.cache.values())
      .reduce((total, entry) => total + JSON.stringify(entry.data).length, 0);

    return {
      size: this.cache.size,
      keys,
      totalMemory
    };
  }

  /**
   * Clean expired entries
   */
  cleanup(duration?: number): number {
    const cacheDuration = duration || this.defaultDuration;
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= cacheDuration) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Global cache instance for dashboard metrics
export const dashboardCache = new MemoryCache(30 * 1000); // 30 seconds

// Cache keys constants
export const CACHE_KEYS = {
  DASHBOARD_METRICS: 'dashboard-metrics',
  DASHBOARD_USERS: 'dashboard-users',
  DASHBOARD_CONTESTS: 'dashboard-contests',
  DASHBOARD_DOCUMENTS: 'dashboard-documents',
  DASHBOARD_INSCRIPTIONS: 'dashboard-inscriptions'
} as const;

/**
 * Helper function to wrap API responses with cache
 */
export function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  duration?: number
): Promise<T & { cached: boolean; timestamp: string }> {
  return new Promise(async (resolve, reject) => {
    try {
      // Check cache first
      const cachedData = dashboardCache.get(key, duration);
      if (cachedData) {
        resolve({
          ...cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Fetch fresh data
      const freshData = await fetchFn();
      
      // Cache the results
      dashboardCache.set(key, freshData);

      resolve({
        ...freshData,
        cached: false,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Enhanced cache utility with performance monitoring
 */
export async function withEnhancedCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    ttl?: number;
    useDistributed?: boolean;
    fallbackToMemory?: boolean;
  } = {}
): Promise<T & { cached: boolean; timestamp: string; cacheType: 'memory' | 'distributed' | 'none' }> {
  const startTime = Date.now();
  const { ttl = 300, useDistributed = true, fallbackToMemory = true } = options;

  try {
    let cachedData: T | null = null;
    let cacheType: 'memory' | 'distributed' | 'none' = 'none';

    // Try distributed cache first if enabled
    if (useDistributed) {
      try {
        const { distributedCache } = await import('./redis-cache');
        cachedData = await distributedCache.get<T>(key);
        if (cachedData) {
          cacheType = 'distributed';
        }
      } catch (error) {
        console.warn('[Cache] Distributed cache error:', error);
      }
    }

    // Fallback to memory cache
    if (!cachedData && fallbackToMemory) {
      cachedData = dashboardCache.get(key, ttl * 1000);
      if (cachedData) {
        cacheType = 'memory';
      }
    }

    if (cachedData) {
      const duration = Date.now() - startTime;
      
      // Record cache hit metric
      const { performanceMonitor } = await import('./performance-monitor');
      performanceMonitor.recordMetric('cache_hit', duration, { 
        key, 
        type: cacheType 
      });

      return {
        ...cachedData,
        cached: true,
        timestamp: new Date().toISOString(),
        cacheType
      } as T & { cached: boolean; timestamp: string; cacheType: 'memory' | 'distributed' | 'none' };
    }

    // Fetch fresh data
    const freshData = await fetchFn();
    const fetchDuration = Date.now() - startTime;
    
    // Cache the results
    if (useDistributed) {
      try {
        const { distributedCache } = await import('./redis-cache');
        await distributedCache.set(key, freshData, ttl);
        cacheType = 'distributed';
      } catch (error) {
        console.warn('[Cache] Failed to set distributed cache:', error);
        if (fallbackToMemory) {
          dashboardCache.set(key, freshData);
          cacheType = 'memory';
        }
      }
    } else if (fallbackToMemory) {
      dashboardCache.set(key, freshData);
      cacheType = 'memory';
    }

    // Record cache miss metric
    const { performanceMonitor } = await import('./performance-monitor');
    performanceMonitor.recordMetric('cache_miss', fetchDuration, { 
      key, 
      type: cacheType 
    });

    return {
      ...freshData,
      cached: false,
      timestamp: new Date().toISOString(),
      cacheType
    } as T & { cached: boolean; timestamp: string; cacheType: 'memory' | 'distributed' | 'none' };

  } catch (error) {
    console.error('[Cache] Error in withEnhancedCache:', error);
    throw error;
  }
}