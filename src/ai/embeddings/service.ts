// src/ai/embeddings/service.ts

/**
 * @fileOverview High-level embedding service for query and response processing
 */

import { SentenceTransformer, getSentenceTransformer } from './transformer';
import { VectorStorage, VectorDocument, SearchResult, getVectorStorage } from './storage';
import { EmbeddingConfig } from './config';

export interface QueryContext {
  query: string;
  response?: string;
  metadata?: {
    userId?: string;
    sessionId?: string;
    timestamp?: number;
    source?: string;
    [key: string]: any;
  };
}

export interface MemoryEntry {
  id: string;
  query: string;
  response: string;
  similarity: number;
  timestamp: number;
  metadata?: any;
}

/**
 * High-level service for managing embeddings and semantic memory
 */
export class EmbeddingService {
  private transformer!: SentenceTransformer;
  private storage!: VectorStorage;
  private initialized = false;

  constructor(
    private config?: Partial<EmbeddingConfig>,
    private storageDir?: string
  ) {}

  /**
   * Initialize the embedding service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🚀 Initializing Embedding Service...');
      
      // Initialize transformer and storage
      this.transformer = await getSentenceTransformer(this.config);
      this.storage = await getVectorStorage(this.storageDir);
      
      this.initialized = true;
      console.log('✅ Embedding Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Embedding Service:', error);
      throw error;
    }
  }

  /**
   * Store a query and its response for future reference
   */
  async storeQueryResponse(context: QueryContext): Promise<{ queryId: string; responseId?: string }> {
    await this.ensureInitialized();

    const { query, response, metadata = {} } = context;
    const timestamp = Date.now();

    // Generate embedding for query
    const queryEmbedding = await this.transformer.encode(query);

    // Store query
    const queryId = await this.storage.store({
      text: query,
      embedding: queryEmbedding.embedding,
      metadata: {
        type: 'query' as const,
        timestamp,
        ...metadata,
      },
    });

    let responseId: string | undefined;

    // Store response if provided
    if (response) {
      const responseEmbedding = await this.transformer.encode(response);
      responseId = await this.storage.store({
        text: response,
        embedding: responseEmbedding.embedding,
        metadata: {
          type: 'response' as const,
          timestamp,
          queryId, // Link response to query
          ...metadata,
        },
      });
    }

    return { queryId, responseId };
  }

  /**
   * Find similar queries from memory
   */
  async findSimilarQueries(
    query: string,
    options: {
      topK?: number;
      minSimilarity?: number;
      includeResponses?: boolean;
      userId?: string;
      sessionId?: string;
    } = {}
  ): Promise<MemoryEntry[]> {
    await this.ensureInitialized();

    const { topK = 5, minSimilarity = 0.7, includeResponses = true, userId, sessionId } = options;

    // Generate embedding for query
    const queryEmbedding = await this.transformer.encode(query);

    // Search for similar queries
    const searchResults = await this.storage.search(queryEmbedding.embedding, {
      topK: topK * 2, // Get more to account for filtering
      minSimilarity,
      type: 'query',
      filter: (doc) => {
        if (userId && doc.metadata.userId !== userId) return false;
        if (sessionId && doc.metadata.sessionId !== sessionId) return false;
        return true;
      },
    });

    // Build memory entries with responses if requested
    const memoryEntries: MemoryEntry[] = [];

    for (const result of searchResults.slice(0, topK)) {
      const queryDoc = result.document;
      let response = '';

      if (includeResponses) {
        // Find corresponding response
        const responses = await this.storage.list(doc => 
          doc.metadata.type === 'response' && 
          doc.metadata.queryId === queryDoc.id
        );
        
        if (responses.length > 0) {
          response = responses[0].text;
        }
      }

      memoryEntries.push({
        id: queryDoc.id,
        query: queryDoc.text,
        response,
        similarity: result.similarity,
        timestamp: queryDoc.metadata.timestamp,
        metadata: queryDoc.metadata,
      });
    }

    console.log(`🧠 Found ${memoryEntries.length} similar queries for: "${query.substring(0, 50)}..."`);
    return memoryEntries;
  }

  /**
   * Find relevant context for a query
   */
  async findRelevantContext(
    query: string,
    options: {
      topK?: number;
      minSimilarity?: number;
      contextTypes?: Array<'query' | 'response' | 'context'>;
    } = {}
  ): Promise<SearchResult[]> {
    await this.ensureInitialized();

    const { topK = 10, minSimilarity = 0.5, contextTypes = ['query', 'response', 'context'] } = options;

    // Generate embedding for query
    const queryEmbedding = await this.transformer.encode(query);

    // Search across all specified types
    const allResults: SearchResult[] = [];

    for (const type of contextTypes) {
      const results = await this.storage.search(queryEmbedding.embedding, {
        topK,
        minSimilarity,
        type,
      });
      allResults.push(...results);
    }

    // Sort by similarity and take top K
    const sortedResults = allResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    console.log(`🔍 Found ${sortedResults.length} relevant context items`);
    return sortedResults;
  }

  /**
   * Store contextual information (e.g., database schema, documentation)
   */
  async storeContext(
    text: string,
    metadata: {
      source: string;
      type?: string;
      category?: string;
      [key: string]: any;
    }
  ): Promise<string> {
    await this.ensureInitialized();

    const embedding = await this.transformer.encode(text);

    return await this.storage.store({
      text,
      embedding: embedding.embedding,
      metadata: {
        type: 'context',
        timestamp: Date.now(),
        ...metadata,
      },
    });
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats() {
    await this.ensureInitialized();
    
    const storageStats = await this.storage.getStats();
    const modelInfo = this.transformer.getModelInfo();

    return {
      storage: storageStats,
      model: modelInfo,
      initialized: this.initialized,
    };
  }

  /**
   * Clean up old memories
   */
  async cleanupMemory(options: {
    maxAge?: number; // milliseconds
    maxEntries?: number;
    keepImportantQueries?: boolean;
  } = {}): Promise<number> {
    await this.ensureInitialized();

    const { maxAge = 7 * 24 * 60 * 60 * 1000, maxEntries = 10000, keepImportantQueries = true } = options;

    const keepTypes = keepImportantQueries ? ['context' as const] : undefined;

    return await this.storage.cleanup({
      maxAge,
      maxDocuments: maxEntries,
      keepTypes,
    });
  }

  /**
   * Export memory for backup
   */
  async exportMemory(): Promise<VectorDocument[]> {
    await this.ensureInitialized();
    return await this.storage.list();
  }

  /**
   * Import memory from backup
   */
  async importMemory(documents: VectorDocument[]): Promise<void> {
    await this.ensureInitialized();
    
    const documentsToStore = documents.map(doc => ({
      text: doc.text,
      embedding: doc.embedding,
      metadata: doc.metadata,
    }));

    await this.storage.storeBatch(documentsToStore);
    console.log(`📥 Imported ${documents.length} memory entries`);
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// Global service instance
let globalService: EmbeddingService | null = null;

/**
 * Get or create global embedding service instance
 */
export async function getEmbeddingService(
  config?: Partial<EmbeddingConfig>,
  storageDir?: string
): Promise<EmbeddingService> {
  if (!globalService) {
    globalService = new EmbeddingService(config, storageDir);
    await globalService.initialize();
  }
  return globalService;
}