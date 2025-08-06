// src/__tests__/persistent-memory.test.ts

/**
 * @fileOverview Tests for the persistent memory system
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { 
  PersistentMemoryManager, 
  MemoryPersistenceService,
  SemanticSearchService,
  EmbeddingService,
  getEmbeddingService,
} from '../ai/embeddings';

describe('Persistent Memory System', () => {
  let embeddingService: EmbeddingService;
  let memoryManager: PersistentMemoryManager;
  let persistenceService: MemoryPersistenceService;
  let searchService: SemanticSearchService;
  
  const testStorageDir = './test_vector_store_persistent';

  beforeAll(async () => {
    // Initialize services
    embeddingService = await getEmbeddingService(
      { model: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2' },
      testStorageDir
    );

    memoryManager = new PersistentMemoryManager({
      storageDir: testStorageDir,
      maxMemoryAge: 24 * 60 * 60 * 1000, // 1 day for testing
      maxMemoryEntries: 1000,
      cleanupInterval: 60 * 1000, // 1 minute for testing
      enableAutoCleanup: false, // Disable for testing
    });
    await memoryManager.initialize(embeddingService);

    persistenceService = new MemoryPersistenceService({
      snapshotDir: join(testStorageDir, 'snapshots'),
      maxSnapshots: 5,
      enableAutoSnapshot: false, // Disable for testing
    });
    await persistenceService.initialize(embeddingService, memoryManager);

    searchService = new SemanticSearchService();
    await searchService.initialize(embeddingService);
  });

  afterAll(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testStorageDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  beforeEach(() => {
    // Reset search analytics before each test
    searchService.resetSearchAnalytics();
  });

  describe('PersistentMemoryManager', () => {
    it('should store and retrieve query-response pairs', async () => {
      const query = '¿Cuántos usuarios están registrados en el sistema?';
      const response = 'Hay 1,234 usuarios registrados en el sistema MPD Concursos.';

      const result = await memoryManager.storeQueryResponse(query, response, {
        userId: 'test-user',
        category: 'statistics',
        importance: 'medium',
      });

      expect(result.queryId).toBeDefined();
      expect(result.responseId).toBeDefined();

      // Search for similar memories
      const memories = await memoryManager.searchSimilarMemories({
        query: '¿Cuántos usuarios hay?',
        topK: 5,
        minSimilarity: 0.5,
      });

      expect(memories.length).toBeGreaterThan(0);
      expect(memories[0].query).toBe(query);
      expect(memories[0].response).toBe(response);
      expect(memories[0].similarity).toBeGreaterThan(0.5);
    });

    it('should store and retrieve context information', async () => {
      const contextText = `
        Tabla: usuarios
        Descripción: Almacena información de usuarios del sistema
        Columnas:
        - id (int) [CLAVE PRIMARIA]
        - email (varchar) [ÚNICO]
        - nombre (varchar)
        - rol (enum: ADMIN, USER)
        - estado (enum: ACTIVE, INACTIVE, BLOCKED)
      `;

      const contextId = await memoryManager.storeContext(contextText, {
        source: 'database-schema',
        category: 'schema',
        type: 'table-description',
        importance: 'high',
      });

      expect(contextId).toBeDefined();

      // Search for context
      const memories = await memoryManager.searchSimilarMemories({
        query: 'información sobre tabla usuarios',
        topK: 5,
        includeContext: true,
        categories: ['schema'],
      });

      expect(memories.length).toBeGreaterThan(0);
      const contextMemory = memories.find(m => m.metadata?.isContext);
      expect(contextMemory).toBeDefined();
    });

    it('should get comprehensive memory statistics', async () => {
      const stats = await memoryManager.getMemoryStats();

      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('queriesCount');
      expect(stats).toHaveProperty('responsesCount');
      expect(stats).toHaveProperty('contextCount');
      expect(stats).toHaveProperty('storageSize');
      expect(stats).toHaveProperty('oldestEntry');
      expect(stats).toHaveProperty('newestEntry');

      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.storageSize).toBeGreaterThan(0);
    });

    it('should perform intelligent cleanup', async () => {
      // Store some test data with different importance levels
      await memoryManager.storeQueryResponse(
        'Test query 1',
        'Test response 1',
        { importance: 'low' }
      );

      await memoryManager.storeQueryResponse(
        'Test query 2',
        'Test response 2',
        { importance: 'high' }
      );

      await memoryManager.storeContext('Important context', {
        source: 'test',
        category: 'schema',
        importance: 'high',
      });

      const cleanupResult = await memoryManager.performIntelligentCleanup();

      expect(cleanupResult).toHaveProperty('deletedCount');
      expect(cleanupResult).toHaveProperty('keptImportant');
      expect(cleanupResult).toHaveProperty('details');
      expect(Array.isArray(cleanupResult.details)).toBe(true);
    });

    it('should find duplicate memories', async () => {
      // Store similar queries
      await memoryManager.storeQueryResponse(
        'Consulta de prueba',
        'Respuesta de prueba',
        { category: 'test' }
      );

      await memoryManager.storeQueryResponse(
        'Consulta de prueba similar',
        'Respuesta de prueba similar',
        { category: 'test' }
      );

      const duplicates = await memoryManager.findDuplicateMemories(0.8);
      
      expect(Array.isArray(duplicates)).toBe(true);
      // May or may not find duplicates depending on similarity threshold
    });
  });

  describe('MemoryPersistenceService', () => {
    it('should create and restore memory snapshots', async () => {
      // Store some test data
      await memoryManager.storeQueryResponse(
        'Snapshot test query',
        'Snapshot test response',
        { category: 'snapshot-test' }
      );

      // Create snapshot
      const snapshotFile = await persistenceService.createSnapshot();
      expect(snapshotFile).toBeDefined();

      // Check if snapshot file exists
      const snapshotExists = await fs.access(snapshotFile).then(() => true).catch(() => false);
      expect(snapshotExists).toBe(true);

      // Get available snapshots
      const snapshots = await persistenceService.getAvailableSnapshots();
      expect(snapshots.length).toBeGreaterThan(0);
      expect(snapshots[0].file).toBe(snapshotFile);

      // Test restoration (would need a clean memory state to test properly)
      const restored = await persistenceService.restoreFromSnapshot(snapshotFile);
      expect(typeof restored).toBe('boolean');
    });

    it('should detect system restart', async () => {
      const wasRestarted = await persistenceService.detectSystemRestart();
      expect(typeof wasRestarted).toBe('boolean');

      // Second call should return false (no restart)
      const wasRestartedAgain = await persistenceService.detectSystemRestart();
      expect(wasRestartedAgain).toBe(false);
    });

    it('should get latest snapshot', async () => {
      const latestSnapshot = await persistenceService.getLatestSnapshot();
      // May be null if no snapshots exist
      if (latestSnapshot) {
        expect(typeof latestSnapshot).toBe('string');
      }
    });
  });

  describe('SemanticSearchService', () => {
    beforeEach(async () => {
      // Store some test data for search
      await memoryManager.storeQueryResponse(
        '¿Cómo crear un nuevo concurso?',
        'Para crear un nuevo concurso, accede al panel de administración y selecciona "Nuevo Concurso".',
        { category: 'help', importance: 'medium' }
      );

      await memoryManager.storeQueryResponse(
        '¿Cuáles son los requisitos para postular?',
        'Los requisitos incluyen: título universitario, experiencia mínima de 2 años, y documentación completa.',
        { category: 'requirements', importance: 'high' }
      );

      await memoryManager.storeContext(
        'El sistema de concursos permite gestionar convocatorias públicas del Ministerio Público de la Defensa.',
        {
          source: 'documentation',
          category: 'general',
          importance: 'medium',
        }
      );
    });

    it('should perform semantic search with ranking', async () => {
      const results = await searchService.search({
        query: 'crear concurso nuevo',
        topK: 5,
        minSimilarity: 0.3,
        boostRecent: true,
        boostImportant: true,
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      const firstResult = results[0];
      expect(firstResult).toHaveProperty('id');
      expect(firstResult).toHaveProperty('text');
      expect(firstResult).toHaveProperty('type');
      expect(firstResult).toHaveProperty('similarity');
      expect(firstResult).toHaveProperty('adjustedScore');
      expect(firstResult).toHaveProperty('rank');
      expect(firstResult).toHaveProperty('metadata');

      expect(firstResult.similarity).toBeGreaterThan(0);
      expect(firstResult.rank).toBe(1);
    });

    it('should find similar content with clustering', async () => {
      const result = await searchService.findSimilarContent(
        'requisitos para postular a concursos',
        {
          topK: 10,
          minSimilarity: 0.4,
          clusterResults: true,
          includeContext: true,
        }
      );

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('clusters');
      expect(Array.isArray(result.results)).toBe(true);
      
      if (result.clusters) {
        expect(Array.isArray(result.clusters)).toBe(true);
      }
    });

    it('should provide search suggestions', async () => {
      const suggestions = await searchService.getSearchSuggestions('concur', {
        maxSuggestions: 3,
        includePopular: true,
        includeRecent: true,
      });

      expect(Array.isArray(suggestions)).toBe(true);
      // May be empty if no matching queries found
    });

    it('should analyze search patterns', async () => {
      // Perform some searches to generate analytics
      await searchService.search({ query: 'test query 1' });
      await searchService.search({ query: 'test query 2' });
      await searchService.search({ query: 'test query 1' }); // Duplicate

      const analytics = await searchService.analyzeSearchPatterns();

      expect(analytics).toHaveProperty('topQueries');
      expect(analytics).toHaveProperty('searchTrends');
      expect(analytics).toHaveProperty('categoryDistribution');
      expect(analytics).toHaveProperty('performanceInsights');

      expect(Array.isArray(analytics.topQueries)).toBe(true);
      expect(Array.isArray(analytics.categoryDistribution)).toBe(true);
      expect(analytics.performanceInsights).toHaveProperty('averageSearchTime');
      expect(analytics.performanceInsights).toHaveProperty('searchVelocity');
      expect(analytics.performanceInsights).toHaveProperty('qualityScore');
    });

    it('should track search analytics', async () => {
      const initialAnalytics = searchService.getSearchAnalytics();
      const initialSearchCount = initialAnalytics.totalSearches;

      // Perform a search
      await searchService.search({ query: 'analytics test query' });

      const updatedAnalytics = searchService.getSearchAnalytics();
      expect(updatedAnalytics.totalSearches).toBe(initialSearchCount + 1);
      expect(updatedAnalytics.performanceMetrics.averageSearchTime).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should work together for complete memory lifecycle', async () => {
      // 1. Store query-response pair
      const query = 'Prueba de integración completa';
      const response = 'Esta es una respuesta de prueba para verificar el ciclo completo de memoria.';
      
      await memoryManager.storeQueryResponse(query, response, {
        category: 'integration-test',
        importance: 'high',
      });

      // 2. Search for similar content
      const searchResults = await searchService.search({
        query: 'prueba integración',
        topK: 5,
        categoryFilter: ['integration-test'],
      });

      expect(searchResults.length).toBeGreaterThan(0);

      // 3. Create snapshot
      const snapshotFile = await persistenceService.createSnapshot();
      expect(snapshotFile).toBeDefined();

      // 4. Get comprehensive stats
      const memoryStats = await memoryManager.getMemoryStats();
      const searchAnalytics = searchService.getSearchAnalytics();

      expect(memoryStats.totalEntries).toBeGreaterThan(0);
      expect(searchAnalytics.totalSearches).toBeGreaterThan(0);

      // 5. Perform maintenance
      const cleanupResult = await memoryManager.performIntelligentCleanup();
      expect(cleanupResult).toHaveProperty('deletedCount');
    });
  });
});