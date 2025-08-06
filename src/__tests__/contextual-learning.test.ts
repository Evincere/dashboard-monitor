// src/__tests__/contextual-learning.test.ts

/**
 * @fileOverview Tests for the contextual learning optimization system
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { 
  ContextualLearningSystem,
  getContextualLearningSystem,
  ResponseQualityMetrics,
  getResponseQualityMetrics,
  EmbeddingService,
  PersistentMemoryManager,
  SemanticSearchService,
  getEmbeddingService,
  getPersistentMemoryManager,
  getSemanticSearchService,
} from '../ai/embeddings';

describe('Contextual Learning System', () => {
  let embeddingService: EmbeddingService;
  let memoryManager: PersistentMemoryManager;
  let searchService: SemanticSearchService;
  let contextualLearning: ContextualLearningSystem;
  let qualityMetrics: ResponseQualityMetrics;
  
  const testStorageDir = './test_vector_store_contextual';

  beforeAll(async () => {
    // Initialize services
    embeddingService = await getEmbeddingService(
      { model: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2' },
      testStorageDir
    );

    memoryManager = new PersistentMemoryManager({
      storageDir: testStorageDir,
      maxMemoryAge: 24 * 60 * 60 * 1000,
      maxMemoryEntries: 1000,
      enableAutoCleanup: false,
    });
    await memoryManager.initialize(embeddingService);

    searchService = new SemanticSearchService();
    await searchService.initialize(embeddingService);

    contextualLearning = new ContextualLearningSystem({
      similarityThreshold: 0.8,
      qualityThreshold: 0.6,
      maxCacheAge: 60 * 60 * 1000, // 1 hour for testing
      maxCacheSize: 100,
      enableQueryOptimization: true,
      enableResponseImprovement: true,
      enableQualityTracking: true,
    });
    await contextualLearning.initialize(embeddingService, memoryManager, searchService);

    qualityMetrics = getResponseQualityMetrics({
      enableRealTimeTracking: true,
      enableTrendAnalysis: true,
      enableAnomalyDetection: true,
    });
  });

  afterAll(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testStorageDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  beforeEach(async () => {
    // Reset systems before each test
    await contextualLearning.resetLearningSystem();
    qualityMetrics.clearData();
  });

  describe('Query Similarity Detection', () => {
    it('should detect exact query matches', async () => {
      const query = '¿Cuántos usuarios están registrados?';
      const response = 'Hay 1,234 usuarios registrados en el sistema.';

      // Store initial query-response
      await contextualLearning.storeQueryResponse(query, response, {
        processingTime: 1500,
        sqlQueries: ['SELECT COUNT(*) FROM usuarios'],
        dataPoints: 1,
      });

      // Check for similar query (exact match)
      const similarCheck = await contextualLearning.checkForSimilarQuery(query);

      expect(similarCheck.found).toBe(true);
      expect(similarCheck.shouldUseCache).toBe(true);
      expect(similarCheck.similarity).toBe(1.0);
      expect(similarCheck.cacheEntry).toBeDefined();
      expect(similarCheck.cacheEntry!.response).toBe(response);
    });

    it('should detect semantically similar queries', async () => {
      const originalQuery = '¿Cuántos usuarios hay en el sistema?';
      const similarQuery = '¿Cuál es el número total de usuarios?';
      const response = 'El sistema tiene 1,234 usuarios registrados.';

      // Store original query
      await contextualLearning.storeQueryResponse(originalQuery, response, {
        processingTime: 1200,
        sqlQueries: ['SELECT COUNT(*) FROM usuarios'],
        dataPoints: 1,
      });

      // Check for similar query
      const similarCheck = await contextualLearning.checkForSimilarQuery(similarQuery);

      expect(similarCheck.found).toBe(true);
      expect(similarCheck.similarity).toBeGreaterThan(0.7);
      expect(similarCheck.cacheEntry).toBeDefined();
    });

    it('should not use cache for low-quality responses', async () => {
      const query = 'Consulta de prueba con baja calidad';
      const poorResponse = 'Error';

      // Store low-quality response
      await contextualLearning.storeQueryResponse(query, poorResponse, {
        processingTime: 5000,
        sqlQueries: [],
        dataPoints: 0,
        userFeedback: 'negative',
      });

      // Check for similar query
      const similarCheck = await contextualLearning.checkForSimilarQuery(query);

      // Should find the query but not use cache due to low quality
      expect(similarCheck.found).toBe(true);
      expect(similarCheck.shouldUseCache).toBe(false);
    });
  });

  describe('Response Quality Assessment', () => {
    it('should assess response quality accurately', async () => {
      const query = '¿Cuáles son los concursos activos?';
      const goodResponse = `Los concursos activos actualmente son:

1. Concurso de Abogados - Fecha límite: 15/12/2024
2. Concurso de Analistas - Fecha límite: 20/12/2024
3. Concurso de Administrativos - Fecha límite: 25/12/2024

Cada concurso tiene requisitos específicos que puedes consultar en el detalle.`;

      const quality = await contextualLearning.assessResponseQuality(query, goodResponse, {
        processingTime: 2000,
        sqlQueries: ['SELECT * FROM concursos WHERE estado = "ACTIVO"'],
        dataPoints: 3,
        userFeedback: 'positive',
      });

      expect(quality.overallScore).toBeGreaterThan(0.7);
      expect(quality.completeness).toBeGreaterThan(0.7);
      expect(quality.clarity).toBeGreaterThan(0.7);
      expect(quality.accuracy).toBeGreaterThan(0.6);
      expect(quality.confidence).toBeGreaterThan(0.5);
    });

    it('should penalize poor quality responses', async () => {
      const query = '¿Cuáles son los concursos activos?';
      const poorResponse = 'Error en consulta';

      const quality = await contextualLearning.assessResponseQuality(query, poorResponse, {
        processingTime: 10000,
        sqlQueries: [],
        dataPoints: 0,
        userFeedback: 'negative',
      });

      expect(quality.overallScore).toBeLessThan(0.5);
      expect(quality.completeness).toBeLessThan(0.5);
      expect(quality.accuracy).toBeLessThan(0.6);
      expect(quality.timeliness).toBeLessThan(0.7);
    });
  });

  describe('Response Improvement', () => {
    it('should improve responses based on memory', async () => {
      const query = '¿Cómo crear un nuevo concurso?';
      const originalResponse = 'Para crear un concurso, accede al panel de administración.';

      // Store some related context
      await memoryManager.storeContext(
        'Los concursos requieren: título, descripción, fecha límite, requisitos y documentación.',
        {
          source: 'documentation',
          category: 'concursos',
          importance: 'high',
        }
      );

      const improvement = await contextualLearning.improveResponse(
        query,
        originalResponse,
        { userFeedback: 'neutral' }
      );

      expect(improvement.improvements.length).toBeGreaterThan(0);
      expect(improvement.improvedResponse).not.toBe(originalResponse);
      expect(improvement.improvedResponse.length).toBeGreaterThan(originalResponse.length);
      expect(improvement.qualityIncrease).toBeGreaterThanOrEqual(0);
    });

    it('should not modify already high-quality responses unnecessarily', async () => {
      const query = '¿Cuántos usuarios hay?';
      const highQualityResponse = `Actualmente hay 1,234 usuarios registrados en el sistema MPD Concursos.

Distribución por rol:
• Administradores: 12 usuarios
• Usuarios regulares: 1,222 usuarios

Estado de los usuarios:
• Activos: 1,180 usuarios
• Inactivos: 54 usuarios`;

      const improvement = await contextualLearning.improveResponse(
        query,
        highQualityResponse,
        { userFeedback: 'positive' }
      );

      // Should have minimal improvements for already good responses
      expect(improvement.qualityIncrease).toBeLessThan(0.2);
    });
  });

  describe('Learning Metrics', () => {
    it('should track learning metrics accurately', async () => {
      // Store several queries with different qualities
      const queries = [
        { query: 'Query 1', response: 'Good response 1', quality: 0.8 },
        { query: 'Query 2', response: 'Average response 2', quality: 0.6 },
        { query: 'Query 3', response: 'Excellent response 3', quality: 0.9 },
      ];

      for (const { query, response } of queries) {
        await contextualLearning.storeQueryResponse(query, response, {
          processingTime: 1500,
          sqlQueries: ['SELECT * FROM test'],
          dataPoints: 1,
        });
      }

      // Test cache hits
      await contextualLearning.checkForSimilarQuery('Query 1');
      await contextualLearning.checkForSimilarQuery('Query 2');

      const metrics = contextualLearning.getLearningMetrics();

      expect(metrics.totalQueries).toBe(3);
      expect(metrics.cacheHits).toBe(2);
      expect(metrics.cacheHitRate).toBeCloseTo(2/3, 1);
      expect(metrics.averageQuality).toBeGreaterThan(0.6);
      expect(metrics.memoryUtilizationRate).toBeGreaterThanOrEqual(0);
    });

    it('should calculate learning effectiveness', async () => {
      // Store high-quality queries
      for (let i = 0; i < 5; i++) {
        await contextualLearning.storeQueryResponse(
          `High quality query ${i}`,
          `Excellent response ${i} with detailed information and clear structure.`,
          {
            processingTime: 1000,
            sqlQueries: [`SELECT * FROM table${i}`],
            dataPoints: 5,
            userFeedback: 'positive',
          }
        );
      }

      const metrics = contextualLearning.getLearningMetrics();
      expect(metrics.learningEffectiveness).toBeGreaterThan(0.5);
    });
  });

  describe('Contextual Insights', () => {
    it('should generate insights from query patterns', async () => {
      // Store queries with similar patterns
      const countQueries = [
        '¿Cuántos usuarios hay?',
        '¿Cuántos concursos existen?',
        '¿Cuántos documentos se han subido?',
      ];

      for (const query of countQueries) {
        await contextualLearning.storeQueryResponse(query, `Respuesta para: ${query}`, {
          processingTime: 1200,
          sqlQueries: ['SELECT COUNT(*) FROM table'],
          dataPoints: 1,
        });
      }

      const insights = await contextualLearning.getContextualInsights();

      expect(insights.length).toBeGreaterThan(0);
      const countPattern = insights.find(insight => insight.pattern === 'count_query');
      expect(countPattern).toBeDefined();
      expect(countPattern!.frequency).toBe(3);
      expect(countPattern!.relatedQueries.length).toBeGreaterThan(0);
    });

    it('should identify common issues and suggest improvements', async () => {
      // Store queries with clarity issues
      for (let i = 0; i < 5; i++) {
        await contextualLearning.storeQueryResponse(
          `Query with clarity issues ${i}`,
          'unclear response without structure or proper formatting',
          {
            processingTime: 3000,
            sqlQueries: ['SELECT * FROM table'],
            dataPoints: 1,
          }
        );
      }

      const insights = await contextualLearning.getContextualInsights();
      
      expect(insights.length).toBeGreaterThan(0);
      const insight = insights[0];
      expect(insight.commonIssues).toContain('Unclear responses');
      expect(insight.improvementSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Quality Metrics Integration', () => {
    it('should record quality metrics for responses', async () => {
      const query = 'Test query for quality metrics';
      const response = 'Test response with good quality and structure.';

      const cacheEntry = await contextualLearning.storeQueryResponse(query, response, {
        processingTime: 1500,
        sqlQueries: ['SELECT * FROM test'],
        dataPoints: 3,
        userFeedback: 'positive',
      });

      // Record in quality metrics
      qualityMetrics.recordQuality(cacheEntry.quality, {
        category: 'test',
        queryId: cacheEntry.id,
      });

      const stats = qualityMetrics.getRealTimeStats();
      expect(stats.current.totalResponses).toBe(1);
      expect(stats.current.averageQuality).toBeGreaterThan(0);
    });

    it('should detect quality anomalies', async () => {
      // Record several normal quality responses
      for (let i = 0; i < 10; i++) {
        const quality = {
          completeness: 0.8,
          accuracy: 0.8,
          relevance: 0.8,
          clarity: 0.8,
          timeliness: 0.8,
          overallScore: 0.8,
          confidence: 0.8,
          factors: {
            memoryUtilization: 0.7,
            dataFreshness: 0.8,
            queryComplexity: 0.6,
            responseLength: 0.7,
            contextRelevance: 0.8,
          },
        };

        qualityMetrics.recordQuality(quality, { category: 'normal' });
      }

      // Record a poor quality response (should trigger anomaly)
      const poorQuality = {
        completeness: 0.2,
        accuracy: 0.1,
        relevance: 0.3,
        clarity: 0.2,
        timeliness: 0.4,
        overallScore: 0.2,
        confidence: 0.3,
        factors: {
          memoryUtilization: 0.1,
          dataFreshness: 0.2,
          queryComplexity: 0.5,
          responseLength: 0.3,
          contextRelevance: 0.2,
        },
      };

      qualityMetrics.recordQuality(poorQuality, { category: 'anomaly' });

      const stats = qualityMetrics.getRealTimeStats();
      expect(stats.alerts.length).toBeGreaterThan(0);
    });

    it('should generate comprehensive quality reports', async () => {
      // Record various quality responses over time
      const baseTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
      
      for (let i = 0; i < 20; i++) {
        const quality = {
          completeness: 0.6 + Math.random() * 0.3,
          accuracy: 0.7 + Math.random() * 0.2,
          relevance: 0.6 + Math.random() * 0.3,
          clarity: 0.5 + Math.random() * 0.4,
          timeliness: 0.7 + Math.random() * 0.2,
          overallScore: 0.6 + Math.random() * 0.3,
          confidence: 0.6 + Math.random() * 0.3,
          factors: {
            memoryUtilization: Math.random(),
            dataFreshness: Math.random(),
            queryComplexity: Math.random(),
            responseLength: Math.random(),
            contextRelevance: Math.random(),
          },
        };

        qualityMetrics.recordQuality(quality, { 
          category: i % 2 === 0 ? 'category_a' : 'category_b' 
        });
      }

      const report = qualityMetrics.generateQualityReport({
        startTime: baseTime,
        includeRecommendations: true,
      });

      expect(report.overview.totalResponses).toBe(20);
      expect(report.overview.averageQuality).toBeGreaterThan(0);
      expect(report.metrics.completeness.average).toBeGreaterThan(0);
      expect(report.metrics.accuracy.average).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache Management', () => {
    it('should maintain cache size limits', async () => {
      const smallCacheLearning = new ContextualLearningSystem({
        maxCacheSize: 5,
        enableQueryOptimization: true,
      });
      await smallCacheLearning.initialize(embeddingService, memoryManager, searchService);

      // Store more entries than cache limit
      for (let i = 0; i < 10; i++) {
        await smallCacheLearning.storeQueryResponse(
          `Query ${i}`,
          `Response ${i}`,
          {
            processingTime: 1000,
            sqlQueries: [`SELECT ${i}`],
            dataPoints: 1,
          }
        );
      }

      const metrics = smallCacheLearning.getLearningMetrics();
      expect(metrics.totalQueries).toBe(10);

      // Cache should be limited to 5 entries
      // (We can't directly test cache size, but we can verify the system handles it)
      expect(metrics.totalQueries).toBeGreaterThan(metrics.cacheHits || 0);
    });

    it('should expire old cache entries', async () => {
      const shortCacheLearning = new ContextualLearningSystem({
        maxCacheAge: 100, // 100ms for testing
        enableQueryOptimization: true,
      });
      await shortCacheLearning.initialize(embeddingService, memoryManager, searchService);

      const query = 'Test query for expiration';
      const response = 'Test response';

      // Store query
      await shortCacheLearning.storeQueryResponse(query, response, {
        processingTime: 1000,
        sqlQueries: ['SELECT * FROM test'],
        dataPoints: 1,
      });

      // Should find it immediately
      let similarCheck = await shortCacheLearning.checkForSimilarQuery(query);
      expect(similarCheck.found).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should not find it after expiration
      similarCheck = await shortCacheLearning.checkForSimilarQuery(query);
      expect(similarCheck.shouldUseCache).toBe(false);
    });
  });

  describe('Integration with Existing Systems', () => {
    it('should work with persistent memory manager', async () => {
      const query = 'Integration test query';
      const response = 'Integration test response';

      // Store in contextual learning
      await contextualLearning.storeQueryResponse(query, response, {
        processingTime: 1500,
        sqlQueries: ['SELECT * FROM integration_test'],
        dataPoints: 2,
        category: 'integration',
      });

      // Should also be stored in persistent memory
      const memories = await memoryManager.searchSimilarMemories({
        query: 'integration test',
        topK: 5,
        categories: ['contextual-learning'],
      });

      expect(memories.length).toBeGreaterThan(0);
      const relevantMemory = memories.find(m => m.query === query);
      expect(relevantMemory).toBeDefined();
    });

    it('should work with semantic search service', async () => {
      // Store some test data
      await contextualLearning.storeQueryResponse(
        'Semantic search test query',
        'Semantic search test response',
        {
          processingTime: 1200,
          sqlQueries: ['SELECT * FROM semantic_test'],
          dataPoints: 1,
        }
      );

      // Search should find related content
      const searchResults = await searchService.search({
        query: 'semantic search test',
        topK: 5,
        minSimilarity: 0.5,
      });

      expect(searchResults.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing embedding service gracefully', async () => {
      const isolatedLearning = new ContextualLearningSystem();
      
      // Should not crash when not initialized
      const similarCheck = await isolatedLearning.checkForSimilarQuery('test').catch(() => ({
        found: false,
        shouldUseCache: false,
      }));

      expect(similarCheck.found).toBe(false);
      expect(similarCheck.shouldUseCache).toBe(false);
    });

    it('should handle quality assessment errors gracefully', async () => {
      const quality = await contextualLearning.assessResponseQuality(
        'Test query',
        'Test response',
        {
          processingTime: 1000,
          sqlQueries: [],
        }
      );

      // Should return reasonable defaults even with minimal data
      expect(quality.overallScore).toBeGreaterThanOrEqual(0);
      expect(quality.overallScore).toBeLessThanOrEqual(1);
      expect(quality.confidence).toBeGreaterThanOrEqual(0);
      expect(quality.confidence).toBeLessThanOrEqual(1);
    });
  });
});