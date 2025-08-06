// src/__tests__/cache-utils.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { dashboardCache, CACHE_KEYS, withCache } from '@/lib/cache-utils';

describe('Cache Utils', () => {
  beforeEach(() => {
    dashboardCache.clear();
  });

  describe('MemoryCache', () => {
    it('should store and retrieve data', () => {
      const testData = { test: 'value' };
      dashboardCache.set('test-key', testData);
      
      const retrieved = dashboardCache.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for expired data', async () => {
      const testData = { test: 'value' };
      dashboardCache.set('test-key', testData);
      
      // Get with very short duration (1ms)
      await new Promise(resolve => setTimeout(resolve, 2));
      const retrieved = dashboardCache.get('test-key', 1);
      expect(retrieved).toBeNull();
    });

    it('should return cache statistics', () => {
      dashboardCache.set('key1', { data: 'test1' });
      dashboardCache.set('key2', { data: 'test2' });
      
      const stats = dashboardCache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
      expect(stats.totalMemory).toBeGreaterThan(0);
    });

    it('should cleanup expired entries', async () => {
      dashboardCache.set('key1', { data: 'test1' });
      dashboardCache.set('key2', { data: 'test2' });
      
      await new Promise(resolve => setTimeout(resolve, 2));
      const cleaned = dashboardCache.cleanup(1); // 1ms duration
      
      expect(cleaned).toBe(2);
      expect(dashboardCache.getStats().size).toBe(0);
    });

    it('should delete specific entries', () => {
      dashboardCache.set('key1', { data: 'test1' });
      dashboardCache.set('key2', { data: 'test2' });
      
      const deleted = dashboardCache.delete('key1');
      expect(deleted).toBe(true);
      expect(dashboardCache.get('key1')).toBeNull();
      expect(dashboardCache.get('key2')).toEqual({ data: 'test2' });
    });

    it('should clear all entries', () => {
      dashboardCache.set('key1', { data: 'test1' });
      dashboardCache.set('key2', { data: 'test2' });
      
      dashboardCache.clear();
      expect(dashboardCache.getStats().size).toBe(0);
    });
  });

  describe('withCache function', () => {
    it('should cache function results', async () => {
      let callCount = 0;
      const testFunction = async () => {
        callCount++;
        return { result: 'test', callCount };
      };

      // First call
      const result1 = await withCache('test-func', testFunction);
      expect(result1.cached).toBe(false);
      expect(result1.result).toBe('test');
      expect(result1.callCount).toBe(1);

      // Second call should be cached
      const result2 = await withCache('test-func', testFunction);
      expect(result2.cached).toBe(true);
      expect(result2.result).toBe('test');
      expect(result2.callCount).toBe(1); // Function not called again
    });

    it('should handle function errors', async () => {
      const errorFunction = async () => {
        throw new Error('Test error');
      };

      await expect(withCache('error-func', errorFunction)).rejects.toThrow('Test error');
    });

    it('should respect custom cache duration', async () => {
      let callCount = 0;
      const testFunction = async () => {
        callCount++;
        return { result: 'test', callCount };
      };

      // First call with short duration
      const result1 = await withCache('short-cache', testFunction, 1); // 1ms
      expect(result1.cached).toBe(false);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 2));

      // Second call should not be cached
      const result2 = await withCache('short-cache', testFunction, 1);
      expect(result2.cached).toBe(false);
      expect(result2.callCount).toBe(2);
    });
  });

  describe('Cache Keys', () => {
    it('should have all required cache keys', () => {
      expect(CACHE_KEYS.DASHBOARD_METRICS).toBe('dashboard-metrics');
      expect(CACHE_KEYS.DASHBOARD_USERS).toBe('dashboard-users');
      expect(CACHE_KEYS.DASHBOARD_CONTESTS).toBe('dashboard-contests');
      expect(CACHE_KEYS.DASHBOARD_DOCUMENTS).toBe('dashboard-documents');
      expect(CACHE_KEYS.DASHBOARD_INSCRIPTIONS).toBe('dashboard-inscriptions');
    });
  });
});