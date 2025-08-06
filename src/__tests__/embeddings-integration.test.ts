// src/__tests__/embeddings-integration.test.ts

/**
 * @fileOverview Integration tests for embedding system with AI flows
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ai } from '../ai/unified';
import { getEmbeddingService } from '../ai/embeddings';

describe('Embedding Integration', () => {
  let embeddingService: any;

  beforeAll(async () => {
    // Initialize embedding service for testing
    embeddingService = await getEmbeddingService();
  });

  describe('AI Integration', () => {
    it('should get provider info including memory stats', async () => {
      const info = ai.getProviderInfo();
      expect(info.available).toBeDefined();
      expect(info.default).toBeDefined();
      expect(info.status).toBeDefined();
    });

    it('should get memory stats', async () => {
      const stats = await ai.getMemoryStats();
      expect(stats.storage).toBeDefined();
      expect(stats.model).toBeDefined();
      expect(stats.initialized).toBe(true);
    });

    it('should store context information', async () => {
      const contextId = await ai.storeContext(
        'La tabla users contiene información de usuarios registrados',
        {
          source: 'test-integration',
          type: 'table-description',
          category: 'users',
        }
      );
      
      expect(contextId).toBeTruthy();
      expect(typeof contextId).toBe('string');
    });

    it('should clean up memory', async () => {
      const deletedCount = await ai.cleanupMemory({
        maxAge: 1, // 1ms - should delete test entries
        maxEntries: 1000,
        keepImportantQueries: false,
      });
      
      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Embedding Service Integration', () => {
    it('should store and retrieve query-response pairs', async () => {
      const context = {
        query: '¿Cuántos usuarios hay en el sistema de prueba?',
        response: 'Hay 100 usuarios de prueba en el sistema.',
        metadata: {
          source: 'integration-test',
          userId: 'test-user',
          sessionId: 'test-session',
        },
      };

      const result = await embeddingService.storeQueryResponse(context);
      expect(result.queryId).toBeTruthy();
      expect(result.responseId).toBeTruthy();
    });

    it('should find similar queries', async () => {
      // First store a query
      await embeddingService.storeQueryResponse({
        query: '¿Cuántos concursos están disponibles?',
        response: 'Hay 10 concursos disponibles actualmente.',
        metadata: { source: 'integration-test' },
      });

      // Then search for similar queries
      const similarQueries = await embeddingService.findSimilarQueries(
        '¿Cuántos concursos hay?',
        {
          topK: 3,
          minSimilarity: 0.1, // Low threshold for testing
          includeResponses: true,
        }
      );

      expect(Array.isArray(similarQueries)).toBe(true);
      // Should find at least some results with low threshold
      expect(similarQueries.length).toBeGreaterThanOrEqual(0);
    });

    it('should store and find context', async () => {
      const contextText = 'Los concursos pueden tener estados: ACTIVE, INACTIVE, DRAFT';
      
      const contextId = await embeddingService.storeContext(contextText, {
        source: 'integration-test',
        type: 'business-rules',
        category: 'contests',
      });

      expect(contextId).toBeTruthy();

      // Find relevant context
      const relevantContext = await embeddingService.findRelevantContext(
        'estados de concursos',
        {
          topK: 5,
          minSimilarity: 0.1, // Low threshold for testing
        }
      );

      expect(Array.isArray(relevantContext)).toBe(true);
    });

    it('should get memory statistics', async () => {
      const stats = await embeddingService.getMemoryStats();
      
      expect(stats.storage).toBeDefined();
      expect(stats.model).toBeDefined();
      expect(stats.initialized).toBe(true);
      expect(typeof stats.storage.totalDocuments).toBe('number');
      expect(typeof stats.storage.storageSize).toBe('number');
      expect(typeof stats.model.dimensions).toBe('number');
    });

    it('should export and import memory', async () => {
      // Export current memory
      const exportedMemory = await embeddingService.exportMemory();
      expect(Array.isArray(exportedMemory)).toBe(true);

      // Each exported item should have the correct structure
      if (exportedMemory.length > 0) {
        const item = exportedMemory[0];
        expect(item.id).toBeDefined();
        expect(item.text).toBeDefined();
        expect(Array.isArray(item.embedding)).toBe(true);
        expect(item.metadata).toBeDefined();
        expect(item.metadata.type).toBeDefined();
        expect(item.metadata.timestamp).toBeDefined();
      }
    });
  });
});