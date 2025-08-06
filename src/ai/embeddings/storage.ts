// src/ai/embeddings/storage.ts

/**
 * @fileOverview Vector storage system for embeddings and semantic search
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { SentenceTransformer } from './transformer';

export interface VectorDocument {
  id: string;
  text: string;
  embedding: number[];
  metadata: {
    timestamp: number;
    type: 'query' | 'response' | 'context';
    source?: string;
    userId?: string;
    sessionId?: string;
    [key: string]: any;
  };
}

export interface SearchResult {
  document: VectorDocument;
  similarity: number;
  rank: number;
}

export interface VectorStorageStats {
  totalDocuments: number;
  storageSize: number;
  lastUpdated: number;
  dimensions: number;
  model: string;
}

/**
 * File-based vector storage for embeddings
 */
export class VectorStorage {
  private storageDir: string;
  private documentsFile: string;
  private metadataFile: string;
  private documents: Map<string, VectorDocument> = new Map();
  private isLoaded = false;

  constructor(storageDir: string = './vector_store') {
    this.storageDir = storageDir;
    this.documentsFile = join(storageDir, 'documents.json');
    this.metadataFile = join(storageDir, 'metadata.json');
  }

  /**
   * Initialize storage and load existing documents
   */
  async initialize(): Promise<void> {
    try {
      // Ensure storage directory exists
      await fs.mkdir(this.storageDir, { recursive: true });

      // Load existing documents
      await this.loadDocuments();
      
      console.log(`📚 Vector storage initialized with ${this.documents.size} documents`);
    } catch (error) {
      console.error('❌ Failed to initialize vector storage:', error);
      throw error;
    }
  }

  /**
   * Store a document with its embedding
   */
  async store(document: Omit<VectorDocument, 'id'>): Promise<string> {
    const id = this.generateId();
    const fullDocument: VectorDocument = {
      id,
      ...document,
      metadata: {
        ...document.metadata,
        timestamp: Date.now(),
      },
    };

    this.documents.set(id, fullDocument);
    await this.saveDocuments();

    console.log(`💾 Stored document ${id} (${document.text.substring(0, 50)}...)`);
    return id;
  }

  /**
   * Store multiple documents in batch
   */
  async storeBatch(documents: Array<Omit<VectorDocument, 'id'>>): Promise<string[]> {
    const ids: string[] = [];

    for (const doc of documents) {
      const id = this.generateId();
      const fullDocument: VectorDocument = {
        id,
        ...doc,
        metadata: {
          ...doc.metadata,
          timestamp: Date.now(),
        },
      };

      this.documents.set(id, fullDocument);
      ids.push(id);
    }

    await this.saveDocuments();
    console.log(`💾 Stored batch of ${documents.length} documents`);
    return ids;
  }

  /**
   * Search for similar documents using semantic similarity
   */
  async search(
    queryEmbedding: number[],
    options: {
      topK?: number;
      minSimilarity?: number;
      filter?: (doc: VectorDocument) => boolean;
      type?: 'query' | 'response' | 'context';
    } = {}
  ): Promise<SearchResult[]> {
    const { topK = 5, minSimilarity = 0.1, filter, type } = options;

    // Filter documents
    let candidates = Array.from(this.documents.values());
    
    if (type) {
      candidates = candidates.filter(doc => doc.metadata.type === type);
    }
    
    if (filter) {
      candidates = candidates.filter(filter);
    }

    // Calculate similarities
    const results = candidates
      .map(doc => ({
        document: doc,
        similarity: SentenceTransformer.cosineSimilarity(queryEmbedding, doc.embedding),
        rank: 0, // Will be set after sorting
      }))
      .filter(result => result.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map((result, index) => ({ ...result, rank: index + 1 }));

    console.log(`🔍 Found ${results.length} similar documents (similarity >= ${minSimilarity})`);
    return results;
  }

  /**
   * Get document by ID
   */
  async get(id: string): Promise<VectorDocument | null> {
    await this.ensureLoaded();
    return this.documents.get(id) || null;
  }

  /**
   * Delete document by ID
   */
  async delete(id: string): Promise<boolean> {
    const deleted = this.documents.delete(id);
    if (deleted) {
      await this.saveDocuments();
      console.log(`🗑️ Deleted document ${id}`);
    }
    return deleted;
  }

  /**
   * Get all documents with optional filtering
   */
  async list(filter?: (doc: VectorDocument) => boolean): Promise<VectorDocument[]> {
    await this.ensureLoaded();
    const docs = Array.from(this.documents.values());
    return filter ? docs.filter(filter) : docs;
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<VectorStorageStats> {
    await this.ensureLoaded();
    
    const docs = Array.from(this.documents.values());
    const storageSize = await this.getStorageSize();
    
    return {
      totalDocuments: docs.length,
      storageSize,
      lastUpdated: Math.max(...docs.map(d => d.metadata.timestamp), 0),
      dimensions: docs[0]?.embedding.length || 0,
      model: 'sentence-transformers', // Could be made dynamic
    };
  }

  /**
   * Clean up old documents based on age or count
   */
  async cleanup(options: {
    maxAge?: number; // milliseconds
    maxDocuments?: number;
    keepTypes?: Array<'query' | 'response' | 'context'>;
  } = {}): Promise<number> {
    await this.ensureLoaded();
    
    const { maxAge, maxDocuments, keepTypes } = options;
    const now = Date.now();
    let deletedCount = 0;

    // Filter by age
    if (maxAge) {
      const cutoffTime = now - maxAge;
      for (const [id, doc] of this.documents) {
        if (doc.metadata.timestamp < cutoffTime && 
            (!keepTypes || !keepTypes.includes(doc.metadata.type))) {
          this.documents.delete(id);
          deletedCount++;
        }
      }
    }

    // Limit by count (keep most recent)
    if (maxDocuments && this.documents.size > maxDocuments) {
      const sortedDocs = Array.from(this.documents.values())
        .sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);
      
      const toDelete = sortedDocs.slice(maxDocuments);
      for (const doc of toDelete) {
        if (!keepTypes || !keepTypes.includes(doc.metadata.type)) {
          this.documents.delete(doc.id);
          deletedCount++;
        }
      }
    }

    if (deletedCount > 0) {
      await this.saveDocuments();
      console.log(`🧹 Cleaned up ${deletedCount} old documents`);
    }

    return deletedCount;
  }

  /**
   * Load documents from storage
   */
  private async loadDocuments(): Promise<void> {
    try {
      const data = await fs.readFile(this.documentsFile, 'utf-8');
      const docs: VectorDocument[] = JSON.parse(data);
      
      this.documents.clear();
      for (const doc of docs) {
        this.documents.set(doc.id, doc);
      }
      
      this.isLoaded = true;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist yet, start with empty storage
        this.documents.clear();
        this.isLoaded = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Save documents to storage
   */
  private async saveDocuments(): Promise<void> {
    const docs = Array.from(this.documents.values());
    await fs.writeFile(this.documentsFile, JSON.stringify(docs, null, 2));
    
    // Save metadata
    const stats = await this.getStats();
    await fs.writeFile(this.metadataFile, JSON.stringify(stats, null, 2));
  }

  /**
   * Ensure documents are loaded
   */
  private async ensureLoaded(): Promise<void> {
    if (!this.isLoaded) {
      await this.loadDocuments();
    }
  }

  /**
   * Generate unique ID for documents
   */
  private generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get storage size in bytes
   */
  private async getStorageSize(): Promise<number> {
    try {
      const stats = await fs.stat(this.documentsFile);
      return stats.size;
    } catch {
      return 0;
    }
  }
}

// Global storage instance
let globalStorage: VectorStorage | null = null;

/**
 * Get or create global vector storage instance
 */
export async function getVectorStorage(storageDir?: string): Promise<VectorStorage> {
  if (!globalStorage) {
    globalStorage = new VectorStorage(storageDir);
    await globalStorage.initialize();
  }
  return globalStorage;
}