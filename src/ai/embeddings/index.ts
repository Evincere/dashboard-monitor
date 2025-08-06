// src/ai/embeddings/index.ts

/**
 * @fileOverview Main embeddings module exports
 */

// Configuration
export type {
  EmbeddingConfig,
} from './config';
export {
  DEFAULT_EMBEDDING_CONFIG,
  EMBEDDING_MODELS,
  getEmbeddingConfig,
  validateEmbeddingConfig,
} from './config';

// Transformer
export type {
  EmbeddingResult,
  BatchEmbeddingResult,
} from './transformer';
export {
  SentenceTransformer,
  getSentenceTransformer,
  generateEmbedding,
  generateBatchEmbeddings,
} from './transformer';

// Storage
export type {
  VectorDocument,
  SearchResult,
  VectorStorageStats,
} from './storage';
export {
  VectorStorage,
  getVectorStorage,
} from './storage';

// Service
export type {
  QueryContext,
  MemoryEntry,
} from './service';
export {
  EmbeddingService,
  getEmbeddingService,
} from './service';

// Persistent Memory
export type {
  PersistentMemoryConfig,
  MemorySearchOptions,
  MemoryStats,
} from './persistent-memory';
export {
  PersistentMemoryManager,
  getPersistentMemoryManager,
} from './persistent-memory';

// Memory Persistence
export type {
  MemorySnapshot,
  PersistenceConfig,
} from './memory-persistence';
export {
  MemoryPersistenceService,
  getMemoryPersistenceService,
} from './memory-persistence';

// Semantic Search
export type {
  SemanticSearchOptions,
  SemanticSearchResult,
  SearchAnalytics,
} from './semantic-search';
export {
  SemanticSearchService,
  getSemanticSearchService,
} from './semantic-search';

// Contextual Learning
export type {
  ContextualLearningConfig,
  QueryCacheEntry,
  ResponseQuality,
  LearningMetrics,
  ContextualInsight,
} from './contextual-learning';
export {
  ContextualLearningSystem,
  getContextualLearningSystem,
} from './contextual-learning';

// Response Quality Metrics
export type {
  QualityMetricsConfig,
  QualityTrend,
  QualityAnomaly,
  QualityReport,
  QualityMetricSummary,
} from './response-quality-metrics';
export {
  ResponseQualityMetrics,
  getResponseQualityMetrics,
} from './response-quality-metrics';