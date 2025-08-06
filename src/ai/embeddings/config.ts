// src/ai/embeddings/config.ts

/**
 * @fileOverview Configuration for embedding models and vector operations
 */

export interface EmbeddingConfig {
  model: string;
  dimensions: number;
  maxTokens: number;
  language: string;
  batchSize: number;
  cacheDir: string;
}

/**
 * Default embedding configuration optimized for Spanish language
 */
export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  // Using multilingual sentence transformer model optimized for Spanish
  model: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
  dimensions: 384, // Optimal balance between quality and performance
  maxTokens: 512, // Maximum input length
  language: 'es', // Spanish language optimization
  batchSize: 32, // Batch size for processing multiple texts
  cacheDir: './vector_store/models', // Local model cache directory
};

/**
 * Alternative models for different use cases
 */
export const EMBEDDING_MODELS = {
  // Multilingual models
  multilingual: {
    mini: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
    base: 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2',
    large: 'sentence-transformers/LaBSE',
  },
  // Spanish-specific models
  spanish: {
    beto: 'sentence-transformers/distiluse-base-multilingual-cased',
    roberta: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
  },
  // Performance-optimized models
  fast: {
    mini: 'sentence-transformers/all-MiniLM-L6-v2',
    distil: 'sentence-transformers/all-distilroberta-v1',
  },
} as const;

/**
 * Get embedding configuration from environment variables or defaults
 */
export function getEmbeddingConfig(): EmbeddingConfig {
  return {
    model: process.env.EMBEDDING_MODEL || DEFAULT_EMBEDDING_CONFIG.model,
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '384'),
    maxTokens: parseInt(process.env.EMBEDDING_MAX_TOKENS || '512'),
    language: process.env.EMBEDDING_LANGUAGE || DEFAULT_EMBEDDING_CONFIG.language,
    batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '32'),
    cacheDir: process.env.EMBEDDING_CACHE_DIR || DEFAULT_EMBEDDING_CONFIG.cacheDir,
  };
}

/**
 * Validate embedding configuration
 */
export function validateEmbeddingConfig(config: EmbeddingConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.model) {
    errors.push('Embedding model is required');
  }

  if (config.dimensions <= 0) {
    errors.push('Embedding dimensions must be positive');
  }

  if (config.maxTokens <= 0) {
    errors.push('Max tokens must be positive');
  }

  if (config.batchSize <= 0) {
    errors.push('Batch size must be positive');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}