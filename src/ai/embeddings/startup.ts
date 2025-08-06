// src/ai/embeddings/startup.ts

/**
 * @fileOverview Startup initialization for the embedding system
 */

import { getEmbeddingService } from './service';
import { initializeSchemaContext } from './schema-context';
import { getEmbeddingConfig, validateEmbeddingConfig } from './config';
import { getPersistentMemoryManager } from './persistent-memory';
import { getMemoryPersistenceService } from './memory-persistence';
import { getSemanticSearchService } from './semantic-search';
import { getContextualLearningSystem } from './contextual-learning';
import { getResponseQualityMetrics } from './response-quality-metrics';

/**
 * Initialize the complete embedding system on startup
 */
export async function initializeEmbeddingSystem(): Promise<void> {
  try {
    console.log('🚀 Starting embedding system initialization...');
    
    // Validate configuration
    const config = getEmbeddingConfig();
    const validation = validateEmbeddingConfig(config);
    
    if (!validation.valid) {
      console.error('❌ Invalid embedding configuration:', validation.errors);
      throw new Error(`Invalid embedding configuration: ${validation.errors.join(', ')}`);
    }
    
    console.log('✅ Embedding configuration validated');
    console.log(`📋 Using model: ${config.model}`);
    console.log(`📐 Dimensions: ${config.dimensions}`);
    console.log(`🌍 Language: ${config.language}`);
    
    // Initialize embedding service
    const embeddingService = await getEmbeddingService();
    console.log('✅ Embedding service initialized');
    
    // Initialize persistent memory manager
    const memoryManager = await getPersistentMemoryManager({
      storageDir: './vector_store',
      maxMemoryAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxMemoryEntries: 50000,
      cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
      enableAutoCleanup: true,
    });
    await memoryManager.initialize(embeddingService);
    console.log('✅ Persistent memory manager initialized');
    
    // Initialize memory persistence service
    const persistenceService = getMemoryPersistenceService({
      snapshotDir: './vector_store/snapshots',
      maxSnapshots: 10,
      snapshotInterval: 6 * 60 * 60 * 1000, // 6 hours
      enableAutoSnapshot: true,
    });
    await persistenceService.initialize(embeddingService, memoryManager);
    console.log('✅ Memory persistence service initialized');
    
    // Initialize semantic search service
    const searchService = await getSemanticSearchService();
    await searchService.initialize(embeddingService);
    console.log('✅ Semantic search service initialized');
    
    // Initialize contextual learning system
    const contextualLearning = await getContextualLearningSystem({
      similarityThreshold: 0.85,
      qualityThreshold: 0.7,
      maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
      maxCacheSize: 1000,
      learningRate: 0.1,
      enableQueryOptimization: true,
      enableResponseImprovement: true,
      enableQualityTracking: true,
    });
    await contextualLearning.initialize(embeddingService, memoryManager, searchService);
    console.log('✅ Contextual learning system initialized');
    
    // Initialize response quality metrics
    const qualityMetrics = getResponseQualityMetrics({
      enableRealTimeTracking: true,
      enableTrendAnalysis: true,
      enableAnomalyDetection: true,
      qualityThresholds: {
        excellent: 0.85,
        good: 0.70,
        acceptable: 0.55,
        poor: 0.40,
      },
    });
    console.log('✅ Response quality metrics initialized');
    
    // Perform startup restoration if needed
    await persistenceService.performStartupRestoration();
    
    // Initialize database schema context
    await initializeSchemaContext();
    console.log('✅ Database schema context initialized');
    
    // Get initial statistics
    const stats = await embeddingService.getMemoryStats();
    const memoryStats = await memoryManager.getMemoryStats();
    const learningMetrics = contextualLearning.getLearningMetrics();
    const qualityStats = qualityMetrics.getRealTimeStats();
    
    console.log(`📊 Memory initialized with ${stats.storage.totalDocuments} documents`);
    console.log(`💾 Storage size: ${(stats.storage.storageSize / 1024).toFixed(2)} KB`);
    console.log(`🧠 Persistent memory: ${memoryStats.totalEntries} entries (${memoryStats.queriesCount} queries, ${memoryStats.responsesCount} responses, ${memoryStats.contextCount} context)`);
    console.log(`🎯 Contextual learning: ${learningMetrics.totalQueries} queries processed, ${(learningMetrics.cacheHitRate * 100).toFixed(1)}% cache hit rate`);
    console.log(`📈 Quality metrics: ${qualityStats.current.totalResponses} responses tracked, avg quality: ${qualityStats.current.averageQuality.toFixed(3)}`);
    
    console.log('🎉 Embedding system initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to initialize embedding system:', error);
    
    // Don't throw the error to prevent app startup failure
    // The system should still work without embeddings
    console.warn('⚠️ Continuing without embedding system...');
  }
}

/**
 * Perform periodic maintenance on the embedding system
 */
export async function performEmbeddingMaintenance(): Promise<void> {
  try {
    console.log('🧹 Starting embedding system maintenance...');
    
    const embeddingService = await getEmbeddingService();
    const memoryManager = await getPersistentMemoryManager();
    
    // Perform intelligent cleanup using the persistent memory manager
    const cleanupResult = await memoryManager.performIntelligentCleanup();
    
    if (cleanupResult.deletedCount > 0) {
      console.log(`🗑️ Cleaned up ${cleanupResult.deletedCount} old memory entries`);
      console.log(`💎 Kept ${cleanupResult.keptImportant} important entries`);
    }
    
    // Create backup
    const backupFile = await memoryManager.createBackup();
    console.log(`💾 Created memory backup: ${backupFile}`);
    
    // Find and report duplicate memories
    const duplicates = await memoryManager.findDuplicateMemories(0.95);
    if (duplicates.length > 0) {
      console.log(`🔍 Found ${duplicates.length} groups of duplicate memories`);
      // Could implement automatic deduplication here
    }
    
    // Perform contextual learning maintenance
    const contextualLearning = await getContextualLearningSystem();
    const learningMetrics = contextualLearning.getLearningMetrics();
    const insights = await contextualLearning.getContextualInsights();
    
    console.log(`🧠 Learning metrics: ${learningMetrics.totalQueries} queries, ${(learningMetrics.cacheHitRate * 100).toFixed(1)}% hit rate, ${(learningMetrics.learningEffectiveness * 100).toFixed(1)}% effectiveness`);
    
    if (insights.length > 0) {
      console.log(`💡 Generated ${insights.length} contextual insights:`);
      insights.slice(0, 3).forEach(insight => {
        console.log(`   - ${insight.pattern}: ${insight.frequency} occurrences, avg quality: ${insight.averageQuality.toFixed(3)}`);
      });
    }
    
    // Generate quality report
    const qualityMetrics = getResponseQualityMetrics();
    const qualityReport = qualityMetrics.generateQualityReport({
      startTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
      includeRecommendations: true,
    });
    
    if (qualityReport.overview.totalResponses > 0) {
      console.log(`📊 Quality report (7 days): ${qualityReport.overview.totalResponses} responses, avg quality: ${qualityReport.overview.averageQuality.toFixed(3)}`);
      
      if (qualityReport.recommendations.length > 0) {
        console.log(`💡 Quality recommendations:`);
        qualityReport.recommendations.slice(0, 3).forEach(rec => {
          console.log(`   - [${rec.priority.toUpperCase()}] ${rec.category}: ${rec.description}`);
        });
      }
      
      if (qualityReport.anomalies.length > 0) {
        console.log(`⚠️ Quality anomalies detected: ${qualityReport.anomalies.length}`);
      }
    }
    
    // Get updated statistics
    const stats = await embeddingService.getMemoryStats();
    const memoryStats = await memoryManager.getMemoryStats();
    
    console.log(`📊 Current memory: ${stats.storage.totalDocuments} documents`);
    console.log(`💾 Storage size: ${(stats.storage.storageSize / 1024).toFixed(2)} KB`);
    console.log(`🧠 Memory stats: ${memoryStats.totalEntries} total, avg similarity: ${memoryStats.averageSimilarity.toFixed(3)}`);
    
    console.log('✅ Embedding system maintenance completed');
    
  } catch (error) {
    console.error('❌ Embedding system maintenance failed:', error);
  }
}

/**
 * Check embedding system health
 */
export async function checkEmbeddingHealth(): Promise<{
  healthy: boolean;
  issues: string[];
  stats?: any;
}> {
  const issues: string[] = [];
  
  try {
    // Check configuration
    const config = getEmbeddingConfig();
    const validation = validateEmbeddingConfig(config);
    
    if (!validation.valid) {
      issues.push(`Configuration issues: ${validation.errors.join(', ')}`);
    }
    
    // Check embedding service
    const embeddingService = await getEmbeddingService();
    const stats = await embeddingService.getMemoryStats();
    
    if (!stats.initialized) {
      issues.push('Embedding service not properly initialized');
    }
    
    if (!stats.model.initialized) {
      issues.push('Embedding model not loaded');
    }
    
    // Check storage
    if (stats.storage.totalDocuments === 0) {
      issues.push('No documents in vector storage (may need schema initialization)');
    }
    
    // Check persistent memory manager
    try {
      const memoryManager = await getPersistentMemoryManager();
      const memoryStats = await memoryManager.getMemoryStats();
      
      if (memoryStats.totalEntries === 0) {
        issues.push('Persistent memory manager has no entries');
      }
      
      // Check if cleanup is overdue (more than 48 hours)
      const cleanupOverdue = Date.now() - memoryStats.lastCleanup > 48 * 60 * 60 * 1000;
      if (cleanupOverdue) {
        issues.push('Memory cleanup is overdue');
      }
      
      // Check if backup is overdue (more than 14 days)
      const backupOverdue = Date.now() - memoryStats.lastBackup > 14 * 24 * 60 * 60 * 1000;
      if (backupOverdue) {
        issues.push('Memory backup is overdue');
      }
      
    } catch (error) {
      issues.push('Persistent memory manager not accessible');
    }
    
    // Check semantic search service
    try {
      const searchService = await getSemanticSearchService();
      const searchAnalytics = searchService.getSearchAnalytics();
      
      if (searchAnalytics.performanceMetrics.averageSearchTime > 5000) {
        issues.push('Search performance is degraded (>5s average)');
      }
      
    } catch (error) {
      issues.push('Semantic search service not accessible');
    }
    
    // Check memory persistence service
    try {
      const persistenceService = getMemoryPersistenceService();
      const snapshots = await persistenceService.getAvailableSnapshots();
      
      if (snapshots.length === 0) {
        issues.push('No memory snapshots available for recovery');
      }
      
      // Check if latest snapshot is too old (more than 24 hours)
      if (snapshots.length > 0) {
        const latestSnapshot = snapshots[0];
        const snapshotAge = Date.now() - latestSnapshot.timestamp;
        if (snapshotAge > 24 * 60 * 60 * 1000) {
          issues.push('Latest memory snapshot is more than 24 hours old');
        }
      }
      
    } catch (error) {
      issues.push('Memory persistence service not accessible');
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      stats: {
        embedding: stats,
        memory: await (await getPersistentMemoryManager()).getMemoryStats().catch(() => null),
        search: (await getSemanticSearchService()).getSearchAnalytics(),
        snapshots: await getMemoryPersistenceService().getAvailableSnapshots().catch(() => []),
      },
    };
    
  } catch (error) {
    issues.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      healthy: false,
      issues,
    };
  }
}