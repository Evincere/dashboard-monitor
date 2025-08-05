// src/lib/database-utils.ts
'use client';

/**
 * Utility functions for database cache management
 * These are client-side utilities and not Server Actions
 */

// Re-export the cache management functions from database service
// This prevents Next.js from treating them as Server Actions

let cachedSchema: any = null;
let cacheTimestamp = 0;
const tableCache = new Map();

interface CacheStatistics {
  hits: number;
  misses: number;
  lastHitTime: Date | null;
  lastMissTime: Date | null;
  lastClearTime: Date | null;
}

const cacheStats: CacheStatistics = {
  hits: 0,
  misses: 0,
  lastHitTime: null,
  lastMissTime: null,
  lastClearTime: null,
};

/**
 * Gets the cache duration from environment or default
 */
function getCacheDuration(): number {
  return parseInt(process.env.SCHEMA_CACHE_DURATION || '3600000', 10); // 1 hour default
}

/**
 * Clears the schema cache, forcing a fresh introspection on next request.
 */
export function clearSchemaCache(): void {
  cachedSchema = null;
  cacheTimestamp = 0;
  tableCache.clear();
  cacheStats.lastClearTime = new Date();
}

/**
 * Gets comprehensive cache information including status, statistics, and performance metrics.
 */
export function getSchemaCacheInfo(): {
  isCached: boolean;
  cacheAge: number;
  remainingTime: number;
  cacheDuration: number;
  statistics: CacheStatistics;
  tableCacheSize: number;
  tableCacheEntries: number;
} {
  const now = Date.now();
  const cacheDuration = getCacheDuration();
  const cacheAge = cachedSchema ? now - cacheTimestamp : 0;
  const remainingTime = cachedSchema ? Math.max(0, cacheDuration - cacheAge) : 0;

  return {
    isCached: cachedSchema !== null,
    cacheAge,
    remainingTime,
    cacheDuration,
    statistics: { ...cacheStats },
    tableCacheSize: Array.from(tableCache.values()).reduce((size, entry) => 
      size + JSON.stringify(entry.data).length, 0),
    tableCacheEntries: tableCache.size,
  };
}