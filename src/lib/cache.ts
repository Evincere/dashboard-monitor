// src/lib/cache.ts - Unified cache system for the application

interface CacheEntry {
  data: any;
  timestamp: number;
}

// Shared cache instance
const cache = new Map<string, CacheEntry>();

// Cache duration configuration
const CACHE_DURATION = 30 * 1000; // 30 seconds

/**
 * Get cached data if it exists and is still valid
 */
export function getCachedData(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

/**
 * Set data in cache with current timestamp
 */
export function setCachedData(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Clear all cache entries that match a pattern
 */
export function clearCacheByPattern(pattern: string): void {
  const keysToDelete = Array.from(cache.keys()).filter(key => key.includes(pattern));
  keysToDelete.forEach(key => cache.delete(key));
}

/**
 * Clear user-related cache entries
 */
export function clearUserCache(): void {
  clearCacheByPattern('users-');
  cache.delete('dashboard-users');
  console.log('🔄 [Cache] User cache cleared');
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  cache.clear();
  console.log('🔄 [Cache] All cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const now = Date.now();
  const entries = Array.from(cache.entries());
  const validEntries = entries.filter(([_, entry]) => now - entry.timestamp < CACHE_DURATION);
  
  return {
    totalEntries: cache.size,
    validEntries: validEntries.length,
    expiredEntries: cache.size - validEntries.length,
    cacheDurationMs: CACHE_DURATION
  };
}
