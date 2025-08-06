// src/lib/redis-cache.ts

/**
 * @fileOverview Redis distributed cache service for high-performance caching
 */

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  defaultTTL?: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

/**
 * Redis-compatible cache implementation
 * Falls back to memory cache if Redis is not available
 */
class DistributedCache {
  private memoryCache = new Map<string, CacheEntry>();
  private config: RedisConfig;
  private isRedisAvailable = false;
  private redisClient: any = null;

  constructor(config: RedisConfig) {
    this.config = {
      defaultTTL: 300, // 5 minutes default
      keyPrefix: 'dashboard:',
      ...config
    };
    
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection with fallback to memory cache
   */
  private async initializeRedis(): Promise<void> {
    try {
      // Try to import redis (optional dependency)
      const redis = await import('redis').catch(() => null);
      
      if (redis) {
        this.redisClient = redis.createClient({
          socket: {
            host: this.config.host,
            port: this.config.port
          },
          password: this.config.password,
          database: this.config.db || 0
        });

        this.redisClient.on('error', (err: Error) => {
          console.warn('[Cache] Redis error, falling back to memory cache:', err.message);
          this.isRedisAvailable = false;
        });

        this.redisClient.on('connect', () => {
          console.log('[Cache] Redis connected successfully');
          this.isRedisAvailable = true;
        });

        await this.redisClient.connect();
      } else {
        console.log('[Cache] Redis not available, using memory cache');
      }
    } catch (error) {
      console.warn('[Cache] Failed to initialize Redis, using memory cache:', error);
      this.isRedisAvailable = false;
    }
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.config.keyPrefix + key;

    try {
      if (this.isRedisAvailable && this.redisClient) {
        const data = await this.redisClient.get(fullKey);
        return data ? JSON.parse(data) : null;
      }
    } catch (error) {
      console.warn('[Cache] Redis get error, falling back to memory:', error);
    }

    // Fallback to memory cache
    const entry = this.memoryCache.get(fullKey);
    if (entry && Date.now() - entry.timestamp < entry.ttl * 1000) {
      return entry.data;
    }

    // Remove expired entry
    this.memoryCache.delete(fullKey);
    return null;
  }

  /**
   * Set cached data
   */
  async set(key: string, data: any, ttl?: number): Promise<void> {
    const fullKey = this.config.keyPrefix + key;
    const cacheTTL = ttl || this.config.defaultTTL!;

    try {
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.setEx(fullKey, cacheTTL, JSON.stringify(data));
        return;
      }
    } catch (error) {
      console.warn('[Cache] Redis set error, falling back to memory:', error);
    }

    // Fallback to memory cache
    this.memoryCache.set(fullKey, {
      data,
      timestamp: Date.now(),
      ttl: cacheTTL
    });
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.config.keyPrefix + key;

    try {
      if (this.isRedisAvailable && this.redisClient) {
        const result = await this.redisClient.del(fullKey);
        return result > 0;
      }
    } catch (error) {
      console.warn('[Cache] Redis delete error, falling back to memory:', error);
    }

    // Fallback to memory cache
    return this.memoryCache.delete(fullKey);
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const keys = await this.redisClient.keys(this.config.keyPrefix + '*');
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
        return;
      }
    } catch (error) {
      console.warn('[Cache] Redis clear error, falling back to memory:', error);
    }

    // Fallback to memory cache
    this.memoryCache.clear();
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    type: 'redis' | 'memory';
    keys: number;
    memoryUsage?: number;
    redisInfo?: any;
  }> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const keys = await this.redisClient.keys(this.config.keyPrefix + '*');
        const info = await this.redisClient.info('memory');
        
        return {
          type: 'redis',
          keys: keys.length,
          redisInfo: info
        };
      }
    } catch (error) {
      console.warn('[Cache] Redis stats error:', error);
    }

    // Memory cache stats
    const memoryUsage = Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + JSON.stringify(entry.data).length, 0);

    return {
      type: 'memory',
      keys: this.memoryCache.size,
      memoryUsage
    };
  }

  /**
   * Check if cache is healthy
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: string }> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.ping();
        return { status: 'healthy', details: 'Redis connection active' };
      }
    } catch (error) {
      return { status: 'degraded', details: 'Redis unavailable, using memory cache' };
    }

    return { status: 'degraded', details: 'Using memory cache only' };
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    this.memoryCache.clear();
  }
}

// Global distributed cache instance
export const distributedCache = new DistributedCache({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'dashboard:',
  defaultTTL: 300 // 5 minutes
});

/**
 * Cache decorator for functions
 */
export function cached(ttl: number = 300) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyName}:${JSON.stringify(args)}`;
      
      // Try to get from cache
      const cached = await distributedCache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await method.apply(this, args);
      
      // Cache the result
      await distributedCache.set(cacheKey, result, ttl);
      
      return result;
    };
  };
}

/**
 * Helper function to wrap API responses with distributed cache
 */
export async function withDistributedCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T & { cached: boolean; timestamp: string }> {
  try {
    // Check cache first
    const cachedData = await distributedCache.get<T>(key);
    if (cachedData) {
      return {
        ...cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      } as T & { cached: boolean; timestamp: string };
    }

    // Fetch fresh data
    const freshData = await fetchFn();
    
    // Cache the results
    await distributedCache.set(key, freshData, ttl);

    return {
      ...freshData,
      cached: false,
      timestamp: new Date().toISOString()
    } as T & { cached: boolean; timestamp: string };
  } catch (error) {
    console.error('[Cache] Error in withDistributedCache:', error);
    throw error;
  }
}