// src/ai/embeddings/transformer.ts

/**
 * @fileOverview Sentence Transformers implementation using Xenova Transformers
 */

import { pipeline } from '@xenova/transformers';
import { EmbeddingConfig, getEmbeddingConfig } from './config';

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
  processingTime: number;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  dimensions: number;
  model: string;
  processingTime: number;
  batchSize: number;
}

/**
 * Sentence Transformers wrapper for generating embeddings
 */
export class SentenceTransformer {
  private pipeline: any | null = null;
  private config: EmbeddingConfig;
  private isInitialized = false;

  constructor(config?: Partial<EmbeddingConfig>) {
    this.config = { ...getEmbeddingConfig(), ...config };
  }

  /**
   * Initialize the transformer pipeline
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log(`🤖 Initializing Sentence Transformer: ${this.config.model}`);
      const startTime = Date.now();

      // Create feature extraction pipeline
      this.pipeline = await pipeline('feature-extraction', this.config.model, {
        cache_dir: this.config.cacheDir,
        local_files_only: false, // Allow downloading if not cached
        revision: 'main',
      });

      const initTime = Date.now() - startTime;
      console.log(`✅ Sentence Transformer initialized in ${initTime}ms`);

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Sentence Transformer:', error);
      throw new Error(`Failed to initialize embedding model: ${error}`);
    }
  }

  /**
   * Generate embedding for a single text
   */
  async encode(text: string): Promise<EmbeddingResult> {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      // Truncate text if too long
      const truncatedText = this.truncateText(text);

      // Generate embedding
      const output = await this.pipeline!(truncatedText, {
        pooling: 'mean',
        normalize: true,
      });

      // Extract embedding array
      const embedding = Array.from(output.data) as number[];

      const processingTime = Date.now() - startTime;

      return {
        embedding,
        dimensions: embedding.length,
        model: this.config.model,
        processingTime,
      };
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async encodeBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    await this.ensureInitialized();

    const startTime = Date.now();
    const embeddings: number[][] = [];

    try {
      // Process in batches to avoid memory issues
      for (let i = 0; i < texts.length; i += this.config.batchSize) {
        const batch = texts.slice(i, i + this.config.batchSize);
        const truncatedBatch = batch.map(text => this.truncateText(text));

        // Process batch
        const batchResults = await Promise.all(
          truncatedBatch.map(async (text) => {
            const output = await this.pipeline!(text, {
              pooling: 'mean',
              normalize: true,
            });
            return Array.from(output.data) as number[];
          })
        );

        embeddings.push(...batchResults);
      }

      const processingTime = Date.now() - startTime;

      return {
        embeddings,
        dimensions: embeddings[0]?.length || 0,
        model: this.config.model,
        processingTime,
        batchSize: texts.length,
      };
    } catch (error) {
      console.error('❌ Failed to generate batch embeddings:', error);
      throw new Error(`Failed to generate batch embeddings: ${error}`);
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find most similar embeddings from a collection
   */
  static findMostSimilar(
    queryEmbedding: number[],
    embeddings: { id: string; embedding: number[]; metadata?: any }[],
    topK: number = 5
  ): Array<{ id: string; similarity: number; metadata?: any }> {
    const similarities = embeddings.map(item => ({
      id: item.id,
      similarity: SentenceTransformer.cosineSimilarity(queryEmbedding, item.embedding),
      metadata: item.metadata,
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Get model information
   */
  getModelInfo() {
    return {
      model: this.config.model,
      dimensions: this.config.dimensions,
      maxTokens: this.config.maxTokens,
      language: this.config.language,
      batchSize: this.config.batchSize,
      initialized: this.isInitialized,
    };
  }

  /**
   * Ensure the transformer is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Truncate text to fit within token limits
   */
  private truncateText(text: string): string {
    // Simple truncation by character count (approximation)
    // In a production system, you might want to use a proper tokenizer
    const maxChars = this.config.maxTokens * 4; // Rough approximation
    return text.length > maxChars ? text.substring(0, maxChars) : text;
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    if (this.pipeline) {
      // Note: Xenova transformers doesn't have explicit cleanup
      // but we can mark as uninitialized
      this.pipeline = null;
      this.isInitialized = false;
      console.log('🧹 Sentence Transformer disposed');
    }
  }
}

// Singleton instance for global use
let globalTransformer: SentenceTransformer | null = null;

/**
 * Get or create global sentence transformer instance
 */
export async function getSentenceTransformer(config?: Partial<EmbeddingConfig>): Promise<SentenceTransformer> {
  if (!globalTransformer) {
    globalTransformer = new SentenceTransformer(config);
    await globalTransformer.initialize();
  }
  return globalTransformer;
}

/**
 * Generate embedding using global transformer
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const transformer = await getSentenceTransformer();
  return transformer.encode(text);
}

/**
 * Generate batch embeddings using global transformer
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
  const transformer = await getSentenceTransformer();
  return transformer.encodeBatch(texts);
}