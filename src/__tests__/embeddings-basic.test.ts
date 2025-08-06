// src/__tests__/embeddings-basic.test.ts

/**
 * @fileOverview Basic tests for the embedding system configuration
 */

import { describe, it, expect } from 'vitest';
import { 
  getEmbeddingConfig,
  validateEmbeddingConfig,
  DEFAULT_EMBEDDING_CONFIG,
  EMBEDDING_MODELS,
} from '../ai/embeddings/config';
import { VectorStorage } from '../ai/embeddings/storage';
import { SentenceTransformer } from '../ai/embeddings/transformer';

describe('Embedding Configuration', () => {
  it('should load default configuration', () => {
    const config = getEmbeddingConfig();
    expect(config.model).toBe('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2');
    expect(config.dimensions).toBe(384);
    expect(config.language).toBe('es');
    expect(config.maxTokens).toBe(512);
    expect(config.batchSize).toBe(32);
  });

  it('should validate valid configuration', () => {
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

  it('should have predefined models', () => {
    expect(EMBEDDING_MODELS.multilingual.mini).toBeTruthy();
    expect(EMBEDDING_MODELS.spanish.beto).toBeTruthy();
    expect(EMBEDDING_MODELS.fast.mini).toBeTruthy();
  });

  it('should use Spanish as default language', () => {
    expect(DEFAULT_EMBEDDING_CONFIG.language).toBe('es');
  });
});

describe('Vector Storage', () => {
  it('should create storage instance', () => {
    const storage = new VectorStorage('./test_vector_store');
    expect(storage).toBeInstanceOf(VectorStorage);
  });

  it('should handle document operations', async () => {
    const storage = new VectorStorage('./test_vector_store');
    await storage.initialize();

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
});

describe('Sentence Transformer', () => {
  it('should create transformer instance', () => {
    const transformer = new SentenceTransformer();
    expect(transformer).toBeInstanceOf(SentenceTransformer);
  });

  it('should calculate cosine similarity correctly', () => {
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

  it('should get model info', () => {
    const transformer = new SentenceTransformer();
    const info = transformer.getModelInfo();
    
    expect(info.model).toBeTruthy();
    expect(info.dimensions).toBe(384);
    expect(info.language).toBe('es');
    expect(info.initialized).toBe(false);
  });
});