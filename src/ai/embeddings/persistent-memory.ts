// src/ai/embeddings/persistent-memory.ts

/**
 * @fileOverview Enhanced persistent memory system with semantic search and automatic cleanup
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { EmbeddingService, QueryContext, MemoryEntry } from './service';
import { VectorStorage, VectorDocument, SearchResult } from './storage';
import { SentenceTransformer } from './transformer';

export interface PersistentMemoryConfig {
  storageDir: string;
  maxMemoryAge: number; // milliseconds
  maxMemoryEntries: number;
  cleanupInterval: number; // milliseconds
  similarityThreshold: number;
  enableAutoCleanup: boolean;
  backupInterval: number; // milliseconds
}

export interface MemorySearchOptions {
  query: string;
  topK?: number;
  minSimilarity?: number;
  includeContext?: boolean;
  timeRange?: {
    start: number;
    end: number;
  };
  userId?: string;
  sessionId?: string;
  categories?: string[];
}

export interface MemoryStats {
  totalEntries: number;
  queriesCount: number;
  responsesCount: number;
  contextCount: number;
  storageSize: number;
  oldestEntry: number;
  newestEntry: number;
  averageSimilarity: number;
  lastCleanup: number;
  lastBackup: number;
}

/**
 * Enhanced persistent memory system with advanced features
 */
export class PersistentMemoryManager {
  private embeddingService!: EmbeddingService;
  private vectorStorage!: VectorStorage;
  private config: PersistentMemoryConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private backupTimer?: NodeJS.Timeout;
  private initialized = false;

  constructor(config?: Partial<PersistentMemoryConfig>) {
    this.config = {
      storageDir: './vector_store',
      maxMemoryAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxMemoryEntries: 50000,
      cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
      similarityThreshold: 0.7,
      enableAutoCleanup: true,
      backupInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
      ...config,
    };
  }

  /**
   * Initialize the persistent memory system
   */
  async initialize(embeddingService: EmbeddingService): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🧠 Initializing Persistent Memory Manager...');

      this.embeddingService = embeddingService;
      
      // Get vector storage from embedding service
      const stats = await embeddingService.getMemoryStats();
      this.vectorStorage = (embeddingService as any).storage;

      // Ensure storage directory exists
      await fs.mkdir(this.config.storageDir, { recursive: true });

      // Start automatic cleanup if enabled
      if (this.config.enableAutoCleanup) {
        this.startAutoCleanup();
      }

      // Start automatic backup
      this.startAutoBackup();

      this.initialized = true;
      console.log('✅ Persistent Memory Manager initialized successfully');
      
      // Log initial stats
      const memoryStats = await this.getMemoryStats();
      console.log(`📊 Memory initialized with ${memoryStats.totalEntries} entries`);
      
    } catch (error) {
      console.error('❌ Failed to initialize Persistent Memory Manager:', error);
      throw error;
    }
  }

  /**
   * Store query and response with enhanced metadata
   */
  async storeQueryResponse(
    query: string,
    response: string,
    metadata: {
      userId?: string;
      sessionId?: string;
      source?: string;
      category?: string;
      importance?: 'low' | 'medium' | 'high';
      tags?: string[];
      [key: string]: any;
    } = {}
  ): Promise<{ queryId: string; responseId: string }> {
    await this.ensureInitialized();

    const context: QueryContext = {
      query,
      response,
      metadata: {
        timestamp: Date.now(),
        importance: 'medium',
        ...metadata,
      },
    };

    const result = await this.embeddingService.storeQueryResponse(context);
    
    console.log(`💾 Stored query-response pair: ${query.substring(0, 50)}...`);
    return {
      queryId: result.queryId,
      responseId: result.responseId!,
    };
  }

  /**
   * Enhanced semantic search with advanced filtering
   */
  async searchSimilarMemories(options: MemorySearchOptions): Promise<MemoryEntry[]> {
    await this.ensureInitialized();

    const {
      query,
      topK = 10,
      minSimilarity = this.config.similarityThreshold,
      includeContext = true,
      timeRange,
      userId,
      sessionId,
      categories,
    } = options;

    // Find similar queries with enhanced filtering
    const memories = await this.embeddingService.findSimilarQueries(query, {
      topK: topK * 2, // Get more to account for filtering
      minSimilarity,
      includeResponses: true,
      userId,
      sessionId,
    });

    // Apply additional filters
    let filteredMemories = memories;

    if (timeRange) {
      filteredMemories = filteredMemories.filter(
        memory => memory.timestamp >= timeRange.start && memory.timestamp <= timeRange.end
      );
    }

    if (categories && categories.length > 0) {
      filteredMemories = filteredMemories.filter(
        memory => memory.metadata?.category && categories.includes(memory.metadata.category)
      );
    }

    // Include contextual information if requested
    if (includeContext) {
      const contextResults = await this.embeddingService.findRelevantContext(query, {
        topK: 5,
        minSimilarity: minSimilarity * 0.8, // Lower threshold for context
      });

      // Add context as additional memory entries
      for (const contextResult of contextResults) {
        if (contextResult.document.metadata.type === 'context') {
          filteredMemories.push({
            id: contextResult.document.id,
            query: `[CONTEXTO] ${contextResult.document.text.substring(0, 100)}...`,
            response: contextResult.document.text,
            similarity: contextResult.similarity,
            timestamp: contextResult.document.metadata.timestamp,
            metadata: {
              ...contextResult.document.metadata,
              isContext: true,
            },
          });
        }
      }
    }

    // Sort by similarity and take top K
    const finalResults = filteredMemories
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    console.log(`🔍 Found ${finalResults.length} similar memories for query`);
    return finalResults;
  }

  /**
   * Store contextual information with categorization
   */
  async storeContext(
    text: string,
    metadata: {
      source: string;
      category: string;
      type?: string;
      importance?: 'low' | 'medium' | 'high';
      tags?: string[];
      [key: string]: any;
    }
  ): Promise<string> {
    await this.ensureInitialized();

    const contextId = await this.embeddingService.storeContext(text, {
      ...metadata,
      timestamp: Date.now(),
      importance: metadata.importance || 'medium',
    });

    console.log(`📚 Stored context: ${metadata.category}/${metadata.source}`);
    return contextId;
  }

  /**
   * Get comprehensive memory statistics
   */
  async getMemoryStats(): Promise<MemoryStats> {
    await this.ensureInitialized();

    const allDocuments = await this.vectorStorage.list();
    const queries = allDocuments.filter(doc => doc.metadata.type === 'query');
    const responses = allDocuments.filter(doc => doc.metadata.type === 'response');
    const contexts = allDocuments.filter(doc => doc.metadata.type === 'context');

    const timestamps = allDocuments.map(doc => doc.metadata.timestamp).filter(Boolean);
    const similarities = allDocuments.map(doc => doc.metadata.similarity).filter(Boolean);

    const storageStats = await this.vectorStorage.getStats();

    return {
      totalEntries: allDocuments.length,
      queriesCount: queries.length,
      responsesCount: responses.length,
      contextCount: contexts.length,
      storageSize: storageStats.storageSize,
      oldestEntry: Math.min(...timestamps, Date.now()),
      newestEntry: Math.max(...timestamps, 0),
      averageSimilarity: similarities.length > 0 ? similarities.reduce((a, b) => a + b, 0) / similarities.length : 0,
      lastCleanup: this.getLastCleanupTime(),
      lastBackup: this.getLastBackupTime(),
    };
  }

  /**
   * Perform intelligent cleanup of old memories
   */
  async performIntelligentCleanup(): Promise<{
    deletedCount: number;
    keptImportant: number;
    details: string[];
  }> {
    await this.ensureInitialized();

    console.log('🧹 Starting intelligent memory cleanup...');
    const details: string[] = [];

    // Get all documents for analysis
    const allDocuments = await this.vectorStorage.list();
    const now = Date.now();
    const cutoffTime = now - this.config.maxMemoryAge;

    let deletedCount = 0;
    let keptImportant = 0;

    // Analyze and clean up documents
    for (const doc of allDocuments) {
      const age = now - doc.metadata.timestamp;
      const isOld = doc.metadata.timestamp < cutoffTime;
      const isImportant = doc.metadata.importance === 'high' || 
                         doc.metadata.type === 'context' ||
                         doc.metadata.category === 'schema';

      if (isOld && !isImportant) {
        await this.vectorStorage.delete(doc.id);
        deletedCount++;
        details.push(`Deleted old ${doc.metadata.type}: ${doc.text.substring(0, 50)}...`);
      } else if (isOld && isImportant) {
        keptImportant++;
        details.push(`Kept important ${doc.metadata.type}: ${doc.text.substring(0, 50)}...`);
      }
    }

    // Handle max entries limit
    const remainingDocs = await this.vectorStorage.list();
    if (remainingDocs.length > this.config.maxMemoryEntries) {
      // Sort by importance and age, keep most important and recent
      const sortedDocs = remainingDocs.sort((a, b) => {
        const importanceScore = (doc: VectorDocument) => {
          if (doc.metadata.importance === 'high') return 3;
          if (doc.metadata.importance === 'medium') return 2;
          return 1;
        };

        const scoreA = importanceScore(a) + (a.metadata.timestamp / 1000000);
        const scoreB = importanceScore(b) + (b.metadata.timestamp / 1000000);
        return scoreB - scoreA;
      });

      const toDelete = sortedDocs.slice(this.config.maxMemoryEntries);
      for (const doc of toDelete) {
        await this.vectorStorage.delete(doc.id);
        deletedCount++;
        details.push(`Deleted excess ${doc.metadata.type}: ${doc.text.substring(0, 50)}...`);
      }
    }

    // Update cleanup timestamp
    await this.updateLastCleanupTime();

    console.log(`🧹 Cleanup completed: ${deletedCount} deleted, ${keptImportant} important kept`);
    return { deletedCount, keptImportant, details };
  }

  /**
   * Create backup of memory data
   */
  async createBackup(): Promise<string> {
    await this.ensureInitialized();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = join(this.config.storageDir, 'backups');
    const backupFile = join(backupDir, `memory-backup-${timestamp}.json`);

    await fs.mkdir(backupDir, { recursive: true });

    const allDocuments = await this.embeddingService.exportMemory();
    const stats = await this.getMemoryStats();

    const backupData = {
      timestamp: Date.now(),
      version: '1.0',
      stats,
      documents: allDocuments,
    };

    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
    await this.updateLastBackupTime();

    console.log(`💾 Memory backup created: ${backupFile}`);
    return backupFile;
  }

  /**
   * Restore memory from backup
   */
  async restoreFromBackup(backupFile: string): Promise<void> {
    await this.ensureInitialized();

    console.log(`📥 Restoring memory from backup: ${backupFile}`);

    const backupData = JSON.parse(await fs.readFile(backupFile, 'utf-8'));
    
    if (!backupData.documents || !Array.isArray(backupData.documents)) {
      throw new Error('Invalid backup file format');
    }

    await this.embeddingService.importMemory(backupData.documents);
    console.log(`✅ Restored ${backupData.documents.length} memory entries from backup`);
  }

  /**
   * Find duplicate or similar memories for deduplication
   */
  async findDuplicateMemories(similarityThreshold: number = 0.95): Promise<Array<{
    original: VectorDocument;
    duplicates: VectorDocument[];
  }>> {
    await this.ensureInitialized();

    const allDocuments = await this.vectorStorage.list();
    const duplicateGroups: Array<{ original: VectorDocument; duplicates: VectorDocument[] }> = [];
    const processed = new Set<string>();

    for (const doc of allDocuments) {
      if (processed.has(doc.id)) continue;

      const similar = await this.vectorStorage.search(doc.embedding, {
        topK: 10,
        minSimilarity: similarityThreshold,
      });

      const duplicates = similar
        .filter(result => result.document.id !== doc.id && !processed.has(result.document.id))
        .map(result => result.document);

      if (duplicates.length > 0) {
        duplicateGroups.push({ original: doc, duplicates });
        processed.add(doc.id);
        duplicates.forEach(dup => processed.add(dup.id));
      }
    }

    console.log(`🔍 Found ${duplicateGroups.length} groups of duplicate memories`);
    return duplicateGroups;
  }

  /**
   * Start automatic cleanup process
   */
  private startAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      try {
        await this.performIntelligentCleanup();
      } catch (error) {
        console.error('❌ Auto cleanup failed:', error);
      }
    }, this.config.cleanupInterval);

    console.log(`⏰ Auto cleanup scheduled every ${this.config.cleanupInterval / (60 * 60 * 1000)} hours`);
  }

  /**
   * Start automatic backup process
   */
  private startAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }

    this.backupTimer = setInterval(async () => {
      try {
        await this.createBackup();
      } catch (error) {
        console.error('❌ Auto backup failed:', error);
      }
    }, this.config.backupInterval);

    console.log(`⏰ Auto backup scheduled every ${this.config.backupInterval / (24 * 60 * 60 * 1000)} days`);
  }

  /**
   * Get last cleanup time from metadata
   */
  private getLastCleanupTime(): number {
    try {
      const metadataFile = join(this.config.storageDir, 'cleanup-metadata.json');
      const data = require(metadataFile);
      return data.lastCleanup || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Update last cleanup time
   */
  private async updateLastCleanupTime(): Promise<void> {
    try {
      await fs.mkdir(this.config.storageDir, { recursive: true });
      const metadataFile = join(this.config.storageDir, 'cleanup-metadata.json');
      const data = { lastCleanup: Date.now() };
      await fs.writeFile(metadataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('⚠️ Failed to update cleanup metadata:', error);
    }
  }

  /**
   * Get last backup time from metadata
   */
  private getLastBackupTime(): number {
    try {
      const metadataFile = join(this.config.storageDir, 'backup-metadata.json');
      const data = require(metadataFile);
      return data.lastBackup || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Update last backup time
   */
  private async updateLastBackupTime(): Promise<void> {
    try {
      await fs.mkdir(this.config.storageDir, { recursive: true });
      const metadataFile = join(this.config.storageDir, 'backup-metadata.json');
      const data = { lastBackup: Date.now() };
      await fs.writeFile(metadataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('⚠️ Failed to update backup metadata:', error);
    }
  }

  /**
   * Ensure the manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      throw new Error('PersistentMemoryManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = undefined;
    }

    console.log('🧹 Persistent Memory Manager disposed');
  }
}

// Global instance
let globalMemoryManager: PersistentMemoryManager | null = null;

/**
 * Get or create global persistent memory manager
 */
export async function getPersistentMemoryManager(
  config?: Partial<PersistentMemoryConfig>
): Promise<PersistentMemoryManager> {
  if (!globalMemoryManager) {
    globalMemoryManager = new PersistentMemoryManager(config);
  }
  return globalMemoryManager;
}