// src/__tests__/persistent-memory-unit.test.ts

/**
 * @fileOverview Unit tests for the persistent memory system (without embedding model)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { 
  PersistentMemoryManager, 
  MemoryPersistenceService,
  SemanticSearchService,
} from '../ai/embeddings';

// Mock the embedding service
const mockEmbeddingService = {
  storeQueryResponse: vi.fn().mockResolvedValue({ queryId: 'query-1', responseId: 'response-1' }),
  findSimilarQueries: vi.fn().mockResolvedValue([
    {
      id: 'memory-1',
      query: 'Test query',
      response: 'Test response',
      similarity: 0.85,
      timestamp: Date.now(),
      metadata: { category: 'test' },
    },
  ]),
  storeContext: vi.fn().mockResolvedValue('context-1'),
  findRelevantContext: vi.fn().mockResolvedValue([]),
  exportMemory: vi.fn().mockResolvedValue([
    {
      id: 'doc-1',
      text: 'Test document',
      embedding: [0.1, 0.2, 0.3],
      metadata: { type: 'query', timestamp: Date.now() },
    },
  ]),
  importMemory: vi.fn().mockResolvedValue(undefined),
  getMemoryStats: vi.fn().mockResolvedValue({
    storage: { totalDocuments: 1, storageSize: 1024 },
    model: { initialized: true },
    initialized: true,
  }),
  transformer: {
    encode: vi.fn().mockResolvedValue({ embedding: [0.1, 0.2, 0.3] }),
  },
};

// Mock the vector storage
const mockVectorStorage = {
  search: vi.fn().mockResolvedValue([
    {
      document: {
        id: 'doc-1',
        text: 'Test document',
        embedding: [0.1, 0.2, 0.3],
        metadata: { type: 'query', timestamp: Date.now(), category: 'test' },
      },
      similarity: 0.85,
      rank: 1,
    },
  ]),
  list: vi.fn().mockResolvedValue([
    {
      id: 'doc-1',
      text: 'Test document',
      embedding: [0.1, 0.2, 0.3],
      metadata: { type: 'query', timestamp: Date.now(), category: 'test' },
    },
  ]),
  getStats: vi.fn().mockResolvedValue({
    totalDocuments: 1,
    storageSize: 1024,
    lastUpdated: Date.now(),
    dimensions: 3,
    model: 'test-model',
  }),
};

describe('Persistent Memory System (Unit Tests)', () => {
  const testStorageDir = './test_vector_store_unit';
  let memoryManager: PersistentMemoryManager;
  let persistenceService: MemoryPersistenceService;
  let searchService: SemanticSearchService;

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testStorageDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }

    // Initialize services with mocks
    memoryManager = new PersistentMemoryManager({
      storageDir: testStorageDir,
      maxMemoryAge: 24 * 60 * 60 * 1000,
      maxMemoryEntries: 1000,
      enableAutoCleanup: false,
    });

    // Mock the internal services
    (memoryManager as any).embeddingService = mockEmbeddingService;
    (memoryManager as any).vectorStorage = mockVectorStorage;
    (memoryManager as any).initialized = true;

    persistenceService = new MemoryPersistenceService({
      snapshotDir: `${testStorageDir}/snapshots`,
      maxSnapshots: 5,
      enableAutoSnapshot: false,
    });

    searchService = new SemanticSearchService();
    (searchService as any).embeddingService = mockEmbeddingService;
    (searchService as any).vectorStorage = mockVectorStorage;
    (searchService as any).initialized = true;
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testStorageDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('PersistentMemoryManager', () => {
    it('should store query-response pairs', async () => {
      const result = await memoryManager.storeQueryResponse(
        'Test query',
        'Test response',
        { category: 'test', importance: 'medium' }
      );

      expect(result.queryId).toBe('query-1');
      expect(result.responseId).toBe('response-1');
      expect(mockEmbeddingService.storeQueryResponse).toHaveBeenCalledWith({
        query: 'Test query',
        response: 'Test response',
        metadata: expect.objectContaining({
          category: 'test',
          importance: 'medium',
          timestamp: expect.any(Number),
        }),
      });
    });

    it('should search similar memories with filtering', async () => {
      const memories = await memoryManager.searchSimilarMemories({
        query: 'Test search',
        topK: 5,
        minSimilarity: 0.7,
        categories: ['test'],
      });

      expect(memories).toHaveLength(1);
      expect(memories[0].query).toBe('Test query');
      expect(memories[0].similarity).toBe(0.85);
      expect(mockEmbeddingService.findSimilarQueries).toHaveBeenCalled();
    });

    it('should store context information', async () => {
      const contextId = await memoryManager.storeContext(
        'Test context',
        {
          source: 'test',
          category: 'schema',
          importance: 'high',
        }
      );

      expect(contextId).toBe('context-1');
      expect(mockEmbeddingService.storeContext).toHaveBeenCalledWith(
        'Test context',
        expect.objectContaining({
          source: 'test',
          category: 'schema',
          importance: 'high',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should get memory statistics', async () => {
      const stats = await memoryManager.getMemoryStats();

      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('queriesCount');
      expect(stats).toHaveProperty('responsesCount');
      expect(stats).toHaveProperty('contextCount');
      expect(stats).toHaveProperty('storageSize');
      expect(stats.totalEntries).toBe(1);
    });

    it('should perform intelligent cleanup', async () => {
      const cleanupResult = await memoryManager.performIntelligentCleanup();

      expect(cleanupResult).toHaveProperty('deletedCount');
      expect(cleanupResult).toHaveProperty('keptImportant');
      expect(cleanupResult).toHaveProperty('details');
      expect(Array.isArray(cleanupResult.details)).toBe(true);
    });

    it('should create and restore backups', async () => {
      const backupFile = await memoryManager.createBackup();
      expect(backupFile).toContain('memory-backup-');
      expect(mockEmbeddingService.exportMemory).toHaveBeenCalled();

      // Check if backup file was created
      const backupExists = await fs.access(backupFile).then(() => true).catch(() => false);
      expect(backupExists).toBe(true);
    });

    it('should find duplicate memories', async () => {
      const duplicates = await memoryManager.findDuplicateMemories(0.9);
      expect(Array.isArray(duplicates)).toBe(true);
      expect(mockVectorStorage.list).toHaveBeenCalled();
    });
  });

  describe('MemoryPersistenceService', () => {
    beforeEach(async () => {
      await persistenceService.initialize(mockEmbeddingService as any, memoryManager);
    });

    it('should create memory snapshots', async () => {
      const snapshotFile = await persistenceService.createSnapshot();
      expect(snapshotFile).toContain('memory-snapshot-');

      // Check if snapshot file exists
      const snapshotExists = await fs.access(snapshotFile).then(() => true).catch(() => false);
      expect(snapshotExists).toBe(true);

      // Verify snapshot content
      const snapshotContent = JSON.parse(await fs.readFile(snapshotFile, 'utf-8'));
      expect(snapshotContent).toHaveProperty('timestamp');
      expect(snapshotContent).toHaveProperty('version');
      expect(snapshotContent).toHaveProperty('memoryStats');
      expect(snapshotContent).toHaveProperty('recentQueries');
      expect(snapshotContent).toHaveProperty('importantContext');
    });

    it('should get available snapshots', async () => {
      // Create a snapshot first
      await persistenceService.createSnapshot();

      const snapshots = await persistenceService.getAvailableSnapshots();
      expect(snapshots.length).toBeGreaterThan(0);
      expect(snapshots[0]).toHaveProperty('file');
      expect(snapshots[0]).toHaveProperty('timestamp');
      expect(snapshots[0]).toHaveProperty('size');
      expect(snapshots[0]).toHaveProperty('age');
    });

    it('should get latest snapshot', async () => {
      // Create a snapshot first
      await persistenceService.createSnapshot();

      const latestSnapshot = await persistenceService.getLatestSnapshot();
      expect(latestSnapshot).toBeDefined();
      expect(typeof latestSnapshot).toBe('string');
    });

    it('should detect system restart', async () => {
      const wasRestarted = await persistenceService.detectSystemRestart();
      expect(typeof wasRestarted).toBe('boolean');

      // Second call should return false
      const wasRestartedAgain = await persistenceService.detectSystemRestart();
      expect(wasRestartedAgain).toBe(false);
    });

    it('should restore from snapshot', async () => {
      // Create a snapshot first
      const snapshotFile = await persistenceService.createSnapshot();

      // Restore from snapshot
      const restored = await persistenceService.restoreFromSnapshot(snapshotFile);
      expect(restored).toBe(true);
      expect(mockEmbeddingService.storeQueryResponse).toHaveBeenCalled();
    });
  });

  describe('SemanticSearchService', () => {
    it('should perform semantic search', async () => {
      const results = await searchService.search({
        query: 'test search',
        topK: 5,
        minSimilarity: 0.5,
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('text');
      expect(results[0]).toHaveProperty('similarity');
      expect(results[0]).toHaveProperty('adjustedScore');
      expect(results[0]).toHaveProperty('rank');
      expect(mockEmbeddingService.transformer.encode).toHaveBeenCalled();
    });

    it('should find similar content with clustering', async () => {
      const result = await searchService.findSimilarContent('test content', {
        topK: 10,
        clusterResults: true,
      });

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('clusters');
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should provide search suggestions', async () => {
      const suggestions = await searchService.getSearchSuggestions('test', {
        maxSuggestions: 3,
      });

      expect(Array.isArray(suggestions)).toBe(true);
      expect(mockEmbeddingService.findSimilarQueries).toHaveBeenCalled();
    });

    it('should track search analytics', async () => {
      const initialAnalytics = searchService.getSearchAnalytics();
      expect(initialAnalytics.totalSearches).toBe(0);

      // Perform a search
      await searchService.search({ query: 'analytics test' });

      const updatedAnalytics = searchService.getSearchAnalytics();
      expect(updatedAnalytics.totalSearches).toBe(1);
      expect(updatedAnalytics.performanceMetrics.averageSearchTime).toBeGreaterThanOrEqual(0);
    });

    it('should analyze search patterns', async () => {
      // Perform some searches
      await searchService.search({ query: 'pattern test 1' });
      await searchService.search({ query: 'pattern test 2' });

      const analysis = await searchService.analyzeSearchPatterns();

      expect(analysis).toHaveProperty('topQueries');
      expect(analysis).toHaveProperty('searchTrends');
      expect(analysis).toHaveProperty('categoryDistribution');
      expect(analysis).toHaveProperty('performanceInsights');
      expect(Array.isArray(analysis.topQueries)).toBe(true);
    });

    it('should reset search analytics', () => {
      // Perform a search to generate analytics
      searchService.search({ query: 'reset test' });

      // Reset analytics
      searchService.resetSearchAnalytics();

      const analytics = searchService.getSearchAnalytics();
      expect(analytics.totalSearches).toBe(0);
      expect(analytics.averageResultCount).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    beforeEach(async () => {
      await persistenceService.initialize(mockEmbeddingService as any, memoryManager);
    });

    it('should handle complete memory lifecycle', async () => {
      // 1. Store data
      const storeResult = await memoryManager.storeQueryResponse(
        'Integration test query',
        'Integration test response',
        { category: 'integration' }
      );
      expect(storeResult.queryId).toBeDefined();

      // 2. Search for data
      const searchResults = await searchService.search({
        query: 'integration test',
        topK: 5,
      });
      expect(searchResults.length).toBeGreaterThan(0);

      // 3. Create snapshot
      const snapshotFile = await persistenceService.createSnapshot();
      expect(snapshotFile).toBeDefined();

      // 4. Get statistics
      const memoryStats = await memoryManager.getMemoryStats();
      const searchAnalytics = searchService.getSearchAnalytics();
      expect(memoryStats.totalEntries).toBeGreaterThan(0);
      expect(searchAnalytics.totalSearches).toBeGreaterThan(0);

      // 5. Perform cleanup
      const cleanupResult = await memoryManager.performIntelligentCleanup();
      expect(cleanupResult).toHaveProperty('deletedCount');
    });

    it('should handle error conditions gracefully', async () => {
      // Test with invalid snapshot file
      const restored = await persistenceService.restoreFromSnapshot('nonexistent-file.json');
      expect(restored).toBe(false);

      // Test search with empty query
      const results = await searchService.search({ query: '' });
      expect(Array.isArray(results)).toBe(true);
    });
  });
});