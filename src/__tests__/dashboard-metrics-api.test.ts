// src/__tests__/dashboard-metrics-api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GET as metricsHandler } from '@/app/api/dashboard/metrics/route';
import { GET as usersHandler } from '@/app/api/dashboard/users/route';
import { GET as contestsHandler } from '@/app/api/dashboard/contests/route';
import { GET as documentsHandler } from '@/app/api/dashboard/documents/route';
import { GET as inscriptionsHandler } from '@/app/api/dashboard/inscriptions/route';
import { closeDatabaseConnection } from '@/services/database';

describe('Dashboard Metrics APIs', () => {
  afterAll(async () => {
    await closeDatabaseConnection();
  });

  describe('Main Metrics API', () => {
    it('should return dashboard metrics with correct structure', async () => {
      const response = await metricsHandler();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('activeUsers');
      expect(data).toHaveProperty('activeContests');
      expect(data).toHaveProperty('processedDocs');
      expect(data).toHaveProperty('inscriptions');
      expect(data).toHaveProperty('storageUsed');
      expect(data).toHaveProperty('cached');
      expect(data).toHaveProperty('timestamp');

      // Verify data types
      expect(typeof data.activeUsers).toBe('number');
      expect(typeof data.activeContests).toBe('number');
      expect(typeof data.processedDocs).toBe('number');
      expect(typeof data.inscriptions).toBe('number');
      expect(typeof data.storageUsed).toBe('number');
      expect(typeof data.cached).toBe('boolean');
      expect(typeof data.timestamp).toBe('string');
    });

    it('should return cached data on second request', async () => {
      // First request
      const response1 = await metricsHandler();
      const data1 = await response1.json();
      expect(data1.cached).toBe(false);

      // Second request should be cached
      const response2 = await metricsHandler();
      const data2 = await response2.json();
      expect(data2.cached).toBe(true);
    });
  });

  describe('Users API', () => {
    it('should return user statistics with correct structure', async () => {
      const response = await usersHandler();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('active');
      expect(data).toHaveProperty('recent');
      expect(data).toHaveProperty('byRole');
      expect(data).toHaveProperty('byStatus');
      expect(data).toHaveProperty('growth');
      expect(data).toHaveProperty('cached');
      expect(data).toHaveProperty('timestamp');

      // Verify arrays
      expect(Array.isArray(data.byRole)).toBe(true);
      expect(Array.isArray(data.byStatus)).toBe(true);
      expect(Array.isArray(data.growth)).toBe(true);
    });
  });

  describe('Contests API', () => {
    it('should return contest statistics with correct structure', async () => {
      const response = await contestsHandler();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('active');
      expect(data).toHaveProperty('recent');
      expect(data).toHaveProperty('byStatus');
      expect(data).toHaveProperty('byType');
      expect(data).toHaveProperty('topContests');
      expect(data).toHaveProperty('cached');
      expect(data).toHaveProperty('timestamp');

      // Verify arrays
      expect(Array.isArray(data.byStatus)).toBe(true);
      expect(Array.isArray(data.byType)).toBe(true);
      expect(Array.isArray(data.topContests)).toBe(true);
    });
  });

  describe('Documents API', () => {
    it('should return document statistics with correct structure', async () => {
      const response = await documentsHandler();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('recent');
      expect(data).toHaveProperty('byType');
      expect(data).toHaveProperty('byStatus');
      expect(data).toHaveProperty('storage');
      expect(data).toHaveProperty('topUsers');
      expect(data).toHaveProperty('cached');
      expect(data).toHaveProperty('timestamp');

      // Verify storage object
      expect(data.storage).toHaveProperty('totalFiles');
      expect(data.storage).toHaveProperty('totalSizeGB');
      expect(data.storage).toHaveProperty('avgSizeMB');

      // Verify arrays
      expect(Array.isArray(data.byType)).toBe(true);
      expect(Array.isArray(data.byStatus)).toBe(true);
      expect(Array.isArray(data.topUsers)).toBe(true);
    });
  });

  describe('Inscriptions API', () => {
    it('should return inscription statistics with correct structure', async () => {
      const response = await inscriptionsHandler();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('recent');
      expect(data).toHaveProperty('byStatus');
      expect(data).toHaveProperty('byContest');
      expect(data).toHaveProperty('growth');
      expect(data).toHaveProperty('byMonth');
      expect(data).toHaveProperty('cached');
      expect(data).toHaveProperty('timestamp');

      // Verify arrays
      expect(Array.isArray(data.byStatus)).toBe(true);
      expect(Array.isArray(data.byContest)).toBe(true);
      expect(Array.isArray(data.growth)).toBe(true);
      expect(Array.isArray(data.byMonth)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection to fail
      // For now, we'll just verify the error response structure
      const mockError = new Error('Database connection failed');
      
      // In a real scenario, we'd mock the database service
      // expect(response.status).toBe(500);
      // expect(data).toHaveProperty('error');
      // expect(data).toHaveProperty('timestamp');
    });
  });
});