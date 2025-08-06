// src/__tests__/embeddings.test.ts

/**
 * @fileOverview Tests for the embedding system
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  SentenceTransformer, 
  EmbeddingService, 
  VectorStorage,
  getEmbeddingConfig,
  validateEmbeddingConfig,
} from '../ai/embeddings';

describe('Embedding System', () => {
  let transformer: SentenceTransformer;
  let service: EmbeddingService;
  let storage: VectorStorage;

  beforeAll(async () => {
    // Initialize components for testing
    transformer = new SentenceTransformer();
    service = new EmbeddingService();
    storage = new VectorStorage('./test_vector_store');
  });

  afterAll(async () => {
    // Cleanup
    await transformer.dispose();
  });

  describe('Configuration', () => {
    it('should load default configuration', () => {
      const config = getEmbeddingConfig();
      expect(config.model).toBe('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2');
      expect(config.dimensions).toBe(384);
      expect(config.language).toBe('es');
    });

    it('should validate configuration', () => {
      const config = getEmbeddingConfig();
      const validation = validateEmbeddingConfig(config);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid configuration', () => {
      const invalidConfig = {
        model: '',
        dimensions: -1,
        maxTokens: 0,
        language: 'es',
        batchSize: 0,
        cacheDir: './cache',
      };
      const validation = validateEmbeddingConfig(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('SentenceTransformer', () => {
    it('should initialize transformer', async () => {
      await transformer.initialize();
      const info = transformer.getModelInfo();
      expect(info.initialized).toBe(true);
      expect(info.model).toContain('sentence-transformers');
    });

    it('should generate embeddings for Spanish text', async () => {
      const spanishText = 'Hola, ¿cómo estás? Este es un texto de prueba en español.';
      const result = await transformer.encode(spanishText);
      
      expect(result.embedding).toBeInstanceOf(Array);
      expect(result.embedding.length).toBe(384); // Default dimensions
      expect(result.dimensions).toBe(384);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.model).toContain('sentence-transformers');
    });

    it('should generate batch embeddings', async () => {
      const texts = [
        '¿Cuántos usuarios hay en el sistema?',
        '¿Cuáles son los concursos activos?',
        'Mostrar estadísticas de documentos',
      ];
      
      const result = await transformer.encodeBatch(texts);
      
      expect(result.embeddings).toHaveLength(3);
      expect(result.embeddings[0]).toHaveLength(384);
      expect(result.batchSize).toBe(3);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should calculate cosine similarity', () => {
      const embedding1 = [1, 0, 0];
      const embedding2 = [0, 1, 0];
      const embedding3 = [1, 0, 0];
      
      const similarity1 = SentenceTransformer.cosineSimilarity(embedding1, embedding2);
      const similarity2 = SentenceTransformer.cosineSimilarity(embedding1, embedding3);
      
      expect(similarity1).toBe(0); // Orthogonal vectors
      expect(similarity2).toBe(1); // Identical vectors
    });

    it('should find most similar embeddings', () => {
      const queryEmbedding = [1, 0, 0];
      const embeddings = [
        { id: 'doc1', embedding: [1, 0, 0] }, // Identical
        { id: 'doc2', embedding: [0, 1, 0] }, // Orthogonal
        { id: 'doc3', embedding: [0.8, 0.6, 0] }, // Similar
      ];
      
      const results = SentenceTransformer.findMostSimilar(queryEmbedding, embeddings, 2);
      
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('doc1');
      expect(results[0].similarity).toBe(1);
      expect(results[1].id).toBe('doc3');
    });
  });

  describe('VectorStorage', () => {
    it('should initialize storage', async () => {
      await storage.initialize();
      const stats = await storage.getStats();
      expect(stats.totalDocuments).toBeGreaterThanOrEqual(0);
    });

    it('should store and retrieve documents', async () => {
      const document = {
        text: 'Test document for storage',
        embedding: [1, 2, 3, 4, 5],
        metadata: {
          type: 'query' as const,
          timestamp: Date.now(),
          source: 'test',
        },
      };
      
      const id = await storage.store(document);
      expect(id).toBeTruthy();
      
      const retrieved = await storage.get(id);
      expect(retrieved).toBeTruthy();
      expect(retrieved!.text).toBe(document.text);
      expect(retrieved!.embedding).toEqual(document.embedding);
    });

    it('should search for similar documents', async () => {
      // Store test documents
      const docs = [
        {
          text: 'Query about users',
          embedding: [1, 0, 0, 0, 0],
          metadata: { type: 'query' as const, timestamp: Date.now() },
        },
        {
          text: 'Query about contests',
          embedding: [0, 1, 0, 0, 0],
          metadata: { type: 'query' as const, timestamp: Date.now() },
        },
        {
          text: 'Similar user query',
          embedding: [0.9, 0.1, 0, 0, 0],
          metadata: { type: 'query' as const, timestamp: Date.now() },
        },
      ];
      
      await storage.storeBatch(docs);
      
      // Search for similar documents
      const queryEmbedding = [1, 0, 0, 0, 0];
      const results = await storage.search(queryEmbedding, {
        topK: 2,
        minSimilarity: 0.5,
      });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0.5);
    });
  });

  describe('EmbeddingService', () => {
    it('should initialize service', async () => {
      await service.initialize();
      const stats = await service.getMemoryStats();
      expect(stats.initialized).toBe(true);
      expect(stats.model.initialized).toBe(true);
    });

    it('should store query and response', async () => {
      const context = {
        query: '¿Cuántos usuarios hay registrados?',
        response: 'Hay 1,234 usuarios registrados en el sistema.',
        metadata: {
          userId: 'test-user',
          sessionId: 'test-session',
        },
      };
      
      const result = await service.storeQueryResponse(context);
      expect(result.queryId).toBeTruthy();
      expect(result.responseId).toBeTruthy();
    });

    it('should find similar queries', async () => {
      // Store some test queries
      await service.storeQueryResponse({
        query: '¿Cuántos concursos están activos?',
        response: 'Hay 5 concursos activos actualmente.',
      });
      
      await service.storeQueryResponse({
        query: '¿Cuál es el estado de los concursos?',
        response: 'Los concursos están funcionando normalmente.',
      });
      
      // Search for similar queries
      const similarQueries = await service.findSimilarQueries(
        '¿Cuántos concursos hay disponibles?',
        { topK: 2, minSimilarity: 0.3 }
      );
      
      expect(similarQueries.length).toBeGreaterThan(0);
      expect(similarQueries[0].similarity).toBeGreaterThan(0.3);
    });

    it('should store and find context', async () => {
      const contextText = 'La tabla users contiene información de usuarios registrados con campos: id, name, email, role, status.';
      
      const contextId = await service.storeContext(contextText, {
        source: 'database-schema',
        type: 'table-description',
        category: 'users',
      });
      
      expect(contextId).toBeTruthy();
      
      // Find relevant context
      const relevantContext = await service.findRelevantContext(
        'información sobre usuarios',
        { topK: 1, minSimilarity: 0.3 }
      );
      
      expect(relevantContext.length).toBeGreaterThan(0);
    });

    it('should clean up old memories', async () => {
      const deletedCount = await service.cleanupMemory({
        maxAge: 1, // 1ms - should delete everything
        maxEntries: 1,
      });
      
      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });
  });
});