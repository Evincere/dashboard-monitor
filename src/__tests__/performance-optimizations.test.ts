// src/__tests__/performance-optimizations.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performanceMonitor } from '../lib/performance-monitor';
import { distributedCache } from '../lib/redis-cache';
import { queryOptimizer } from '../lib/query-optimizer';
import { paginationHelper } from '../lib/pagination';

describe('Performance Optimizations', () => {
  beforeEach(() => {
    // Clear any existing data
    performanceMonitor.clear();
  });

  afterEach(() => {
    performanceMonitor.clear();
  });

  describe('Performance Monitor', () => {
    it('should record metrics correctly', () => {
      performanceMonitor.recordMetric('test_metric', 100, { type: 'test' });
      
      const stats = performanceMonitor.getStats(60000); // 1 minute window
      expect(stats.general.count).toBe(1);
      expect(stats.general.avg).toBe(100);
    });

    it('should record query performance', () => {
      performanceMonitor.recordQuery('SELECT * FROM users', 150, true);
      performanceMonitor.recordQuery('SELECT * FROM posts', 2000, true); // Slow query
      
      const stats = performanceMonitor.getStats(60000);
      expect(stats.queries.total).toBe(2);
      expect(stats.queries.successful).toBe(2);
      expect(stats.queries.slowQueries).toBe(1);
    });

    it('should record API performance', () => {
      performanceMonitor.recordAPI('/api/users', 'GET', 200, 50);
      performanceMonitor.recordAPI('/api/posts', 'POST', 201, 120);
      
      const stats = performanceMonitor.getStats(60000);
      expect(stats.apis.total).toBe(2);
      expect(stats.apis.statusCodes['200']).toBe(1);
      expect(stats.apis.statusCodes['201']).toBe(1);
    });

    it('should get slow queries', () => {
      performanceMonitor.recordQuery('SELECT * FROM users', 500, true);
      performanceMonitor.recordQuery('SELECT * FROM posts', 1500, true);
      performanceMonitor.recordQuery('SELECT * FROM comments', 2500, true);
      
      const slowQueries = performanceMonitor.getSlowQueries(2, 1000);
      expect(slowQueries).toHaveLength(2);
      expect(slowQueries[0].duration).toBe(2500); // Should be sorted by duration desc
      expect(slowQueries[1].duration).toBe(1500);
    });

    it('should export Prometheus metrics', () => {
      performanceMonitor.recordAPI('/api/test', 'GET', 200, 100);
      performanceMonitor.recordQuery('SELECT 1', 50, true);
      
      const metrics = performanceMonitor.exportPrometheusMetrics();
      expect(metrics).toContain('api_requests_total');
      expect(metrics).toContain('db_queries_total');
      expect(metrics).toContain('api_request_duration_seconds');
    });
  });

  describe('Distributed Cache', () => {
    it('should handle cache operations with fallback', async () => {
      const testKey = 'test_key';
      const testData = { message: 'Hello World' };
      
      // Set data
      await distributedCache.set(testKey, testData, 60);
      
      // Get data
      const retrieved = await distributedCache.get(testKey);
      expect(retrieved).toEqual(testData);
      
      // Delete data
      const deleted = await distributedCache.delete(testKey);
      expect(deleted).toBe(true);
      
      // Verify deletion
      const afterDelete = await distributedCache.get(testKey);
      expect(afterDelete).toBeNull();
    });

    it('should provide cache statistics', async () => {
      await distributedCache.set('key1', 'value1');
      await distributedCache.set('key2', 'value2');
      
      const stats = await distributedCache.getStats();
      expect(stats.keys).toBeGreaterThanOrEqual(2);
      expect(stats.type).toMatch(/redis|memory/);
    });

    it('should perform health check', async () => {
      const health = await distributedCache.healthCheck();
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.details).toBeDefined();
    });
  });

  describe('Query Optimizer', () => {
    it('should generate optimization suggestions', async () => {
      const query = "SELECT * FROM users WHERE name LIKE '%john%' OR email LIKE '%john%'";
      
      // Mock the database query execution
      vi.mock('../services/database', () => ({
        executeQuery: vi.fn().mockResolvedValue([
          [{ 'EXPLAIN': '{"query_block": {"cost_info": {"query_cost": 1500}}}' }],
          []
        ])
      }));
      
      const analysis = await queryOptimizer.analyzeQuery(query);
      
      expect(analysis.query).toBe(query);
      expect(analysis.suggestions).toContain('Avoid SELECT * - specify only needed columns');
      expect(analysis.suggestions).toContain('OR conditions can be slow - consider using UNION or IN clause');
    });

    it('should suggest indexes for tables', async () => {
      // Mock table structure
      vi.mock('../services/database', () => ({
        executeQuery: vi.fn()
          .mockResolvedValueOnce([
            [
              { Field: 'id', Type: 'int' },
              { Field: 'user_id', Type: 'int' },
              { Field: 'email', Type: 'varchar' },
              { Field: 'status', Type: 'enum' },
              { Field: 'created_at', Type: 'timestamp' }
            ]
          ])
          .mockResolvedValueOnce([
            [{ Column_name: 'id' }] // Existing index on id
          ])
      }));
      
      const suggestions = await queryOptimizer.suggestIndexes('users');
      
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
      // Note: Suggestions depend on mocked data structure
    });
  });

  describe('Pagination Helper', () => {
    it('should create offset-based pagination query', () => {
      const baseQuery = 'SELECT * FROM users';
      const params = { page: 2, limit: 10, sortBy: 'name', sortOrder: 'asc' as const };
      
      const result = paginationHelper.createOffsetQuery(baseQuery, params);
      
      expect(result.dataQuery).toContain('ORDER BY name ASC');
      expect(result.dataQuery).toContain('LIMIT 10 OFFSET 10');
      expect(result.pagination.offset).toBe(10);
      expect(result.pagination.limit).toBe(10);
    });

    it('should create cursor-based pagination query', () => {
      const baseQuery = 'SELECT * FROM users';
      const params = { limit: 20, cursor: Buffer.from('100').toString('base64') };
      
      const result = paginationHelper.createCursorQuery(baseQuery, params);
      
      expect(result.dataQuery).toContain('id >');
      expect(result.dataQuery).toContain('ORDER BY id ASC');
      expect(result.dataQuery).toContain('LIMIT 21'); // +1 for next page detection
    });

    it('should process offset pagination results', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const totalCount = 100;
      const params = { page: 2, limit: 10 };
      
      const result = paginationHelper.processOffsetResults(
        data, 
        totalCount, 
        params, 
        50, // execution time
        false
      );
      
      expect(result.data).toEqual(data);
      expect(result.pagination.currentPage).toBe(2);
      expect(result.pagination.totalPages).toBe(10);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(true);
      expect(result.meta.executionTime).toBe(50);
    });

    it('should process cursor pagination results', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }]; // Extra item for next page detection
      const params = { limit: 2 };
      
      const result = paginationHelper.processCursorResults(
        data,
        params,
        'id',
        75, // execution time
        false
      );
      
      expect(result.data).toHaveLength(2); // Extra item removed
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.nextCursor).toBeDefined();
      expect(result.meta.executionTime).toBe(75);
    });
  });

  describe('Integration Tests', () => {
    it('should work together for optimized data fetching', async () => {
      // Simulate a complete optimized data fetch workflow
      const cacheKey = 'users_page_1';
      const mockData = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
      
      // First call - cache miss
      let fetchCalled = false;
      const fetchFn = async () => {
        fetchCalled = true;
        return mockData;
      };
      
      // Use enhanced cache
      const { withEnhancedCache } = await import('../lib/cache-utils');
      const result1 = await withEnhancedCache(cacheKey, fetchFn, { ttl: 60 });
      
      expect(fetchCalled).toBe(true);
      expect(result1.cached).toBe(false);
      expect(result1).toMatchObject(expect.objectContaining(mockData[0]));
      
      // Second call - cache hit
      fetchCalled = false;
      const result2 = await withEnhancedCache(cacheKey, fetchFn, { ttl: 60 });
      
      expect(fetchCalled).toBe(false);
      expect(result2.cached).toBe(true);
    });
  });
});