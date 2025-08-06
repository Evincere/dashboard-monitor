// src/ai/embeddings/memory-persistence.ts

/**
 * @fileOverview Memory persistence service for system restart recovery
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { EmbeddingService } from './service';
import { PersistentMemoryManager } from './persistent-memory';

export interface MemorySnapshot {
  timestamp: number;
  version: string;
  systemInfo: {
    nodeVersion: string;
    platform: string;
    uptime: number;
  };
  memoryStats: {
    totalEntries: number;
    queriesCount: number;
    responsesCount: number;
    contextCount: number;
    storageSize: number;
  };
  recentQueries: Array<{
    id: string;
    query: string;
    response: string;
    timestamp: number;
    metadata: any;
  }>;
  importantContext: Array<{
    id: string;
    text: string;
    category: string;
    source: string;
    timestamp: number;
  }>;
}

export interface PersistenceConfig {
  snapshotDir: string;
  maxSnapshots: number;
  snapshotInterval: number; // milliseconds
  enableAutoSnapshot: boolean;
  compressionEnabled: boolean;
}

/**
 * Service for persisting memory across system restarts
 */
export class MemoryPersistenceService {
  private config: PersistenceConfig;
  private snapshotTimer?: NodeJS.Timeout;
  private embeddingService?: EmbeddingService;
  private memoryManager?: PersistentMemoryManager;

  constructor(config?: Partial<PersistenceConfig>) {
    this.config = {
      snapshotDir: './vector_store/snapshots',
      maxSnapshots: 10,
      snapshotInterval: 6 * 60 * 60 * 1000, // 6 hours
      enableAutoSnapshot: true,
      compressionEnabled: true,
      ...config,
    };
  }

  /**
   * Initialize the persistence service
   */
  async initialize(
    embeddingService: EmbeddingService,
    memoryManager: PersistentMemoryManager
  ): Promise<void> {
    this.embeddingService = embeddingService;
    this.memoryManager = memoryManager;

    // Ensure snapshot directory exists
    await fs.mkdir(this.config.snapshotDir, { recursive: true });

    // Start automatic snapshots if enabled
    if (this.config.enableAutoSnapshot) {
      this.startAutoSnapshot();
    }

    console.log('💾 Memory Persistence Service initialized');
  }

  /**
   * Create a memory snapshot for persistence
   */
  async createSnapshot(): Promise<string> {
    if (!this.embeddingService || !this.memoryManager) {
      throw new Error('Persistence service not initialized');
    }

    console.log('📸 Creating memory snapshot...');

    const timestamp = Date.now();
    const snapshotFile = join(
      this.config.snapshotDir,
      `memory-snapshot-${new Date(timestamp).toISOString().replace(/[:.]/g, '-')}.json`
    );

    // Gather memory statistics
    const memoryStats = await this.memoryManager.getMemoryStats();

    // Get recent queries (last 100)
    const recentQueries = await this.getRecentQueries(100);

    // Get important context
    const importantContext = await this.getImportantContext();

    // Create snapshot data
    const snapshot: MemorySnapshot = {
      timestamp,
      version: '1.0',
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
      },
      memoryStats: {
        totalEntries: memoryStats.totalEntries,
        queriesCount: memoryStats.queriesCount,
        responsesCount: memoryStats.responsesCount,
        contextCount: memoryStats.contextCount,
        storageSize: memoryStats.storageSize,
      },
      recentQueries,
      importantContext,
    };

    // Write snapshot to file
    const snapshotData = JSON.stringify(snapshot, null, 2);
    await fs.writeFile(snapshotFile, snapshotData);

    // Clean up old snapshots
    await this.cleanupOldSnapshots();

    console.log(`✅ Memory snapshot created: ${snapshotFile}`);
    console.log(`📊 Snapshot contains ${recentQueries.length} recent queries and ${importantContext.length} context items`);

    return snapshotFile;
  }

  /**
   * Restore memory from the latest snapshot
   */
  async restoreFromLatestSnapshot(): Promise<boolean> {
    if (!this.embeddingService || !this.memoryManager) {
      throw new Error('Persistence service not initialized');
    }

    const latestSnapshot = await this.getLatestSnapshot();
    if (!latestSnapshot) {
      console.log('ℹ️ No snapshots found for restoration');
      return false;
    }

    return await this.restoreFromSnapshot(latestSnapshot);
  }

  /**
   * Restore memory from a specific snapshot
   */
  async restoreFromSnapshot(snapshotFile: string): Promise<boolean> {
    if (!this.embeddingService || !this.memoryManager) {
      throw new Error('Persistence service not initialized');
    }

    try {
      console.log(`📥 Restoring memory from snapshot: ${snapshotFile}`);

      const snapshotData = await fs.readFile(snapshotFile, 'utf-8');
      const snapshot: MemorySnapshot = JSON.parse(snapshotData);

      // Validate snapshot version
      if (snapshot.version !== '1.0') {
        console.warn(`⚠️ Snapshot version ${snapshot.version} may not be compatible`);
      }

      // Restore recent queries
      let restoredQueries = 0;
      for (const query of snapshot.recentQueries) {
        try {
          await this.memoryManager.storeQueryResponse(
            query.query,
            query.response,
            {
              ...query.metadata,
              restored: true,
              originalTimestamp: query.timestamp,
            }
          );
          restoredQueries++;
        } catch (error) {
          console.warn(`⚠️ Failed to restore query ${query.id}:`, error);
        }
      }

      // Restore important context
      let restoredContext = 0;
      for (const context of snapshot.importantContext) {
        try {
          await this.memoryManager.storeContext(context.text, {
            source: context.source,
            category: context.category,
            restored: true,
            originalTimestamp: context.timestamp,
          });
          restoredContext++;
        } catch (error) {
          console.warn(`⚠️ Failed to restore context ${context.id}:`, error);
        }
      }

      console.log(`✅ Memory restoration completed:`);
      console.log(`   - Restored ${restoredQueries}/${snapshot.recentQueries.length} queries`);
      console.log(`   - Restored ${restoredContext}/${snapshot.importantContext.length} context items`);

      return true;
    } catch (error) {
      console.error('❌ Failed to restore from snapshot:', error);
      return false;
    }
  }

  /**
   * Get list of available snapshots
   */
  async getAvailableSnapshots(): Promise<Array<{
    file: string;
    timestamp: number;
    size: number;
    age: number;
  }>> {
    try {
      const files = await fs.readdir(this.config.snapshotDir);
      const snapshots = [];

      for (const file of files) {
        if (file.startsWith('memory-snapshot-') && file.endsWith('.json')) {
          const filePath = join(this.config.snapshotDir, file);
          const stats = await fs.stat(filePath);
          
          // Extract timestamp from filename
          const timestampMatch = file.match(/memory-snapshot-(.+)\.json/);
          const timestamp = timestampMatch ? 
            new Date(timestampMatch[1].replace(/-/g, ':')).getTime() : 
            stats.mtime.getTime();

          snapshots.push({
            file: filePath,
            timestamp,
            size: stats.size,
            age: Date.now() - timestamp,
          });
        }
      }

      return snapshots.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('❌ Failed to get available snapshots:', error);
      return [];
    }
  }

  /**
   * Get the latest snapshot file
   */
  async getLatestSnapshot(): Promise<string | null> {
    const snapshots = await this.getAvailableSnapshots();
    return snapshots.length > 0 ? snapshots[0].file : null;
  }

  /**
   * Check if system restart was detected
   */
  async detectSystemRestart(): Promise<boolean> {
    const runtimeFile = join(this.config.snapshotDir, 'runtime.json');
    
    try {
      const runtimeData = JSON.parse(await fs.readFile(runtimeFile, 'utf-8'));
      const currentUptime = process.uptime();
      
      // If current uptime is less than stored uptime, system was restarted
      const wasRestarted = currentUptime < runtimeData.uptime;
      
      // Update runtime data
      await fs.writeFile(runtimeFile, JSON.stringify({
        uptime: currentUptime,
        timestamp: Date.now(),
        pid: process.pid,
      }, null, 2));
      
      return wasRestarted;
    } catch (error) {
      // First run or file doesn't exist
      await fs.writeFile(runtimeFile, JSON.stringify({
        uptime: process.uptime(),
        timestamp: Date.now(),
        pid: process.pid,
      }, null, 2));
      
      return false;
    }
  }

  /**
   * Perform automatic restoration on startup if needed
   */
  async performStartupRestoration(): Promise<void> {
    const wasRestarted = await this.detectSystemRestart();
    
    if (wasRestarted) {
      console.log('🔄 System restart detected, attempting memory restoration...');
      
      const restored = await this.restoreFromLatestSnapshot();
      if (restored) {
        console.log('✅ Memory successfully restored from snapshot');
      } else {
        console.log('ℹ️ No snapshot available for restoration');
      }
    } else {
      console.log('ℹ️ No system restart detected, continuing with existing memory');
    }
  }

  /**
   * Get recent queries for snapshot
   */
  private async getRecentQueries(limit: number): Promise<Array<{
    id: string;
    query: string;
    response: string;
    timestamp: number;
    metadata: any;
  }>> {
    if (!this.embeddingService) return [];

    try {
      // Get all documents and filter recent queries
      const allMemories = await this.embeddingService.exportMemory();
      const queries = allMemories
        .filter(doc => doc.metadata.type === 'query')
        .sort((a, b) => b.metadata.timestamp - a.metadata.timestamp)
        .slice(0, limit);

      const recentQueries = [];
      for (const query of queries) {
        // Find corresponding response
        const response = allMemories.find(doc => 
          doc.metadata.type === 'response' && 
          doc.metadata.queryId === query.id
        );

        recentQueries.push({
          id: query.id,
          query: query.text,
          response: response?.text || '',
          timestamp: query.metadata.timestamp,
          metadata: query.metadata,
        });
      }

      return recentQueries;
    } catch (error) {
      console.error('❌ Failed to get recent queries:', error);
      return [];
    }
  }

  /**
   * Get important context for snapshot
   */
  private async getImportantContext(): Promise<Array<{
    id: string;
    text: string;
    category: string;
    source: string;
    timestamp: number;
  }>> {
    if (!this.embeddingService) return [];

    try {
      const allMemories = await this.embeddingService.exportMemory();
      const contexts = allMemories
        .filter(doc => 
          doc.metadata.type === 'context' && 
          (doc.metadata.importance === 'high' || doc.metadata.category === 'schema')
        )
        .map(doc => ({
          id: doc.id,
          text: doc.text,
          category: doc.metadata.category || 'general',
          source: doc.metadata.source || 'unknown',
          timestamp: doc.metadata.timestamp,
        }));

      return contexts;
    } catch (error) {
      console.error('❌ Failed to get important context:', error);
      return [];
    }
  }

  /**
   * Clean up old snapshots
   */
  private async cleanupOldSnapshots(): Promise<void> {
    const snapshots = await this.getAvailableSnapshots();
    
    if (snapshots.length > this.config.maxSnapshots) {
      const toDelete = snapshots.slice(this.config.maxSnapshots);
      
      for (const snapshot of toDelete) {
        try {
          await fs.unlink(snapshot.file);
          console.log(`🗑️ Deleted old snapshot: ${snapshot.file}`);
        } catch (error) {
          console.warn(`⚠️ Failed to delete snapshot ${snapshot.file}:`, error);
        }
      }
    }
  }

  /**
   * Start automatic snapshot creation
   */
  private startAutoSnapshot(): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
    }

    this.snapshotTimer = setInterval(async () => {
      try {
        await this.createSnapshot();
      } catch (error) {
        console.error('❌ Auto snapshot failed:', error);
      }
    }, this.config.snapshotInterval);

    console.log(`⏰ Auto snapshots scheduled every ${this.config.snapshotInterval / (60 * 60 * 1000)} hours`);
  }

  /**
   * Stop automatic snapshots
   */
  stopAutoSnapshot(): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = undefined;
      console.log('⏹️ Auto snapshots stopped');
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    this.stopAutoSnapshot();
    console.log('🧹 Memory Persistence Service disposed');
  }
}

// Global instance
let globalPersistenceService: MemoryPersistenceService | null = null;

/**
 * Get or create global memory persistence service
 */
export function getMemoryPersistenceService(
  config?: Partial<PersistenceConfig>
): MemoryPersistenceService {
  if (!globalPersistenceService) {
    globalPersistenceService = new MemoryPersistenceService(config);
  }
  return globalPersistenceService;
}