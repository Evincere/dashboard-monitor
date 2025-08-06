// src/ai/embeddings/contextual-learning.ts

/**
 * @fileOverview Contextual learning optimization system for improving AI responses
 * through memory utilization and query similarity detection
 */

import { EmbeddingService, MemoryEntry } from './service';
import { PersistentMemoryManager } from './persistent-memory';
import { SemanticSearchService } from './semantic-search';

export interface ContextualLearningConfig {
    similarityThreshold: number;
    qualityThreshold: number;
    maxCacheAge: number; // milliseconds
    maxCacheSize: number;
    learningRate: number;
    enableQueryOptimization: boolean;
    enableResponseImprovement: boolean;
    enableQualityTracking: boolean;
}

export interface QueryCacheEntry {
    id: string;
    originalQuery: string;
    normalizedQuery: string;
    response: string;
    quality: ResponseQuality;
    timestamp: number;
    usageCount: number;
    lastUsed: number;
    metadata: {
        processingTime: number;
        sqlQueries: string[];
        dataPoints: number;
        userFeedback?: 'positive' | 'negative' | 'neutral';
        [key: string]: any;
    };
}

export interface ResponseQuality {
    completeness: number; // 0-1
    accuracy: number; // 0-1
    relevance: number; // 0-1
    clarity: number; // 0-1
    timeliness: number; // 0-1
    overallScore: number; // 0-1
    confidence: number; // 0-1
    factors: {
        memoryUtilization: number;
        dataFreshness: number;
        queryComplexity: number;
        responseLength: number;
        contextRelevance: number;
    };
}

export interface LearningMetrics {
    totalQueries: number;
    cacheHits: number;
    cacheHitRate: number;
    averageQuality: number;
    qualityImprovement: number;
    processingTimeReduction: number;
    memoryUtilizationRate: number;
    learningEffectiveness: number;
}

export interface ContextualInsight {
    pattern: string;
    frequency: number;
    averageQuality: number;
    commonIssues: string[];
    improvementSuggestions: string[];
    relatedQueries: string[];
}

/**
 * Contextual learning system for optimizing AI responses through memory
 */
export class ContextualLearningSystem {
    private config: ContextualLearningConfig;
    private queryCache: Map<string, QueryCacheEntry> = new Map();
    private qualityHistory: ResponseQuality[] = [];
    private learningMetrics: LearningMetrics;
    private embeddingService?: EmbeddingService;
    private memoryManager?: PersistentMemoryManager;
    private searchService?: SemanticSearchService;
    private initialized = false;

    constructor(config?: Partial<ContextualLearningConfig>) {
        this.config = {
            similarityThreshold: 0.85,
            qualityThreshold: 0.7,
            maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
            maxCacheSize: 1000,
            learningRate: 0.1,
            enableQueryOptimization: true,
            enableResponseImprovement: true,
            enableQualityTracking: true,
            ...config,
        };

        this.learningMetrics = {
            totalQueries: 0,
            cacheHits: 0,
            cacheHitRate: 0,
            averageQuality: 0,
            qualityImprovement: 0,
            processingTimeReduction: 0,
            memoryUtilizationRate: 0,
            learningEffectiveness: 0,
        };
    }

    /**
     * Initialize the contextual learning system
     */
    async initialize(
        embeddingService: EmbeddingService,
        memoryManager: PersistentMemoryManager,
        searchService: SemanticSearchService
    ): Promise<void> {
        if (this.initialized) return;

        this.embeddingService = embeddingService;
        this.memoryManager = memoryManager;
        this.searchService = searchService;

        // Load existing cache from memory
        await this.loadCacheFromMemory();

        this.initialized = true;
        console.log('🧠 Contextual Learning System initialized');
    }

    /**
     * Check if a similar query exists and return cached response if available
     */
    async checkForSimilarQuery(query: string): Promise<{
        found: boolean;
        cacheEntry?: QueryCacheEntry;
        similarity?: number;
        shouldUseCache: boolean;
    }> {
        await this.ensureInitialized();

        const normalizedQuery = this.normalizeQuery(query);

        // First check exact cache match
        if (this.queryCache.has(normalizedQuery)) {
            const cacheEntry = this.queryCache.get(normalizedQuery)!;

            // Check if cache entry is still valid
            if (this.isCacheEntryValid(cacheEntry)) {
                cacheEntry.usageCount++;
                cacheEntry.lastUsed = Date.now();
                this.learningMetrics.cacheHits++;

                console.log(`💾 Cache hit for query: ${query.substring(0, 50)}...`);
                return {
                    found: true,
                    cacheEntry,
                    similarity: 1.0,
                    shouldUseCache: true,
                };
            } else {
                // Remove expired cache entry
                this.queryCache.delete(normalizedQuery);
            }
        }

        // Search for similar queries using semantic search
        if (this.searchService) {
            try {
                const similarMemories = await this.searchService.search({
                    query,
                    topK: 5,
                    minSimilarity: this.config.similarityThreshold,
                    searchTypes: ['query'],
                    boostRecent: true,
                    boostImportant: true,
                });

                for (const memory of similarMemories) {
                    const cacheKey = this.normalizeQuery(memory.text);
                    const cacheEntry = this.queryCache.get(cacheKey);

                    if (cacheEntry && this.isCacheEntryValid(cacheEntry)) {
                        // Check if quality is good enough to reuse
                        if (cacheEntry.quality.overallScore >= this.config.qualityThreshold) {
                            cacheEntry.usageCount++;
                            cacheEntry.lastUsed = Date.now();
                            this.learningMetrics.cacheHits++;

                            console.log(`🔍 Similar query found (${memory.similarity.toFixed(2)}): ${memory.text.substring(0, 50)}...`);
                            return {
                                found: true,
                                cacheEntry,
                                similarity: memory.similarity,
                                shouldUseCache: true,
                            };
                        } else {
                            // Found similar query but quality is too low
                            return {
                                found: true,
                                cacheEntry,
                                similarity: memory.similarity,
                                shouldUseCache: false,
                            };
                        }
                    }
                }
            } catch (error) {
                console.warn('⚠️ Search service error in checkForSimilarQuery:', error);
            }
        }

        return {
            found: false,
            shouldUseCache: false,
        };
    }

    /**
     * Store query response with quality assessment
     */
    async storeQueryResponse(
        query: string,
        response: string,
        metadata: {
            processingTime: number;
            sqlQueries: string[];
            dataPoints?: number;
            userFeedback?: 'positive' | 'negative' | 'neutral';
            [key: string]: any;
        }
    ): Promise<QueryCacheEntry> {
        await this.ensureInitialized();

        const normalizedQuery = this.normalizeQuery(query);
        const quality = await this.assessResponseQuality(query, response, metadata);

        const cacheEntry: QueryCacheEntry = {
            id: `cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            originalQuery: query,
            normalizedQuery,
            response,
            quality,
            timestamp: Date.now(),
            usageCount: 1,
            lastUsed: Date.now(),
            metadata: {
                processingTime: metadata.processingTime,
                sqlQueries: metadata.sqlQueries,
                dataPoints: metadata.dataPoints || 0,
                userFeedback: metadata.userFeedback,
                ...metadata,
            },
        };

        // Store in cache
        this.queryCache.set(normalizedQuery, cacheEntry);

        // Store in persistent memory for future learning
        if (this.memoryManager) {
            await this.memoryManager.storeQueryResponse(query, response, {
                category: 'contextual-learning',
                importance: quality.overallScore > 0.8 ? 'high' : 'medium',
                quality: quality.overallScore,
                processingTime: metadata.processingTime,
                cacheId: cacheEntry.id,
            });
        }

        // Update learning metrics
        this.updateLearningMetrics(cacheEntry);

        // Maintain cache size
        await this.maintainCacheSize();

        console.log(`📚 Stored query response with quality ${quality.overallScore.toFixed(2)}`);
        return cacheEntry;
    }

    /**
     * Improve response based on memory and context
     */
    async improveResponse(
        originalQuery: string,
        originalResponse: string,
        context?: {
            relatedMemories?: MemoryEntry[];
            userFeedback?: 'positive' | 'negative' | 'neutral';
            additionalContext?: string;
        }
    ): Promise<{
        improvedResponse: string;
        improvements: string[];
        qualityIncrease: number;
    }> {
        await this.ensureInitialized();

        if (!this.config.enableResponseImprovement) {
            return {
                improvedResponse: originalResponse,
                improvements: [],
                qualityIncrease: 0,
            };
        }

        const improvements: string[] = [];
        let improvedResponse = originalResponse;

        // Get related memories for context
        let relatedMemories = context?.relatedMemories;
        if (!relatedMemories && this.searchService) {
            try {
                const searchResults = await this.searchService.search({
                    query: originalQuery,
                    topK: 10,
                    minSimilarity: 0.6,
                    includeMetadata: true,
                });

                relatedMemories = searchResults.map(result => ({
                    id: result.id,
                    query: result.text,
                    response: '', // Will be filled from metadata if available
                    similarity: result.similarity,
                    timestamp: result.metadata.timestamp,
                    metadata: result.metadata,
                }));
            } catch (error) {
                console.warn('⚠️ Search service error in improveResponse:', error);
                relatedMemories = [];
            }
        }

        // Analyze response completeness
        if (relatedMemories && relatedMemories.length > 0) {
            const missingInfo = this.identifyMissingInformation(originalResponse, relatedMemories);
            if (missingInfo.length > 0) {
                improvements.push('Added missing contextual information');
                improvedResponse = this.enhanceWithMissingInfo(improvedResponse, missingInfo);
            }
        }

        // Improve clarity based on successful patterns
        const clarityImprovements = await this.improveClarityFromPatterns(originalResponse);
        if (clarityImprovements.length > 0) {
            improvements.push('Enhanced clarity based on successful patterns');
            improvedResponse = this.applyClarityImprovements(improvedResponse, clarityImprovements);
        }

        // Add contextual examples if beneficial
        const examples = await this.findRelevantExamples(originalQuery);
        if (examples.length > 0) {
            improvements.push('Added relevant examples from memory');
            improvedResponse = this.addRelevantExamples(improvedResponse, examples);
        }

        // Calculate quality increase
        const originalQuality = await this.assessResponseQuality(originalQuery, originalResponse, {
            processingTime: 0,
            sqlQueries: [],
        });

        const improvedQuality = await this.assessResponseQuality(originalQuery, improvedResponse, {
            processingTime: 0,
            sqlQueries: [],
        });

        const qualityIncrease = improvedQuality.overallScore - originalQuality.overallScore;

        console.log(`✨ Response improved with ${improvements.length} enhancements (quality +${qualityIncrease.toFixed(3)})`);

        return {
            improvedResponse,
            improvements,
            qualityIncrease,
        };
    }

    /**
     * Assess response quality based on multiple factors
     */
    async assessResponseQuality(
        query: string,
        response: string,
        metadata: {
            processingTime: number;
            sqlQueries: string[];
            dataPoints?: number;
            userFeedback?: 'positive' | 'negative' | 'neutral';
        }
    ): Promise<ResponseQuality> {
        const factors = {
            memoryUtilization: 0,
            dataFreshness: 0,
            queryComplexity: 0,
            responseLength: 0,
            contextRelevance: 0,
        };

        // Assess completeness (based on response length and structure)
        const completeness = Math.min(1.0, response.length / 200) *
            (response.includes('?') ? 0.9 : 1.0) * // Penalize questions in responses
            (response.split('.').length > 1 ? 1.0 : 0.8); // Reward structured responses

        // Assess accuracy (based on data points and SQL queries)
        const accuracy = metadata.dataPoints ?
            Math.min(1.0, metadata.dataPoints / 5) :
            (metadata.sqlQueries.length > 0 ? 0.8 : 0.5);

        // Assess relevance (based on query-response similarity)
        const relevance = await this.calculateQueryResponseRelevance(query, response);

        // Assess clarity (based on readability metrics)
        const clarity = this.assessResponseClarity(response);

        // Assess timeliness (based on processing time)
        const timeliness = Math.max(0.1, 1.0 - (metadata.processingTime / 30000)); // 30s max

        // Calculate memory utilization factor
        if (this.searchService) {
            const relatedMemories = await this.searchService.search({
                query,
                topK: 5,
                minSimilarity: 0.5,
            });
            factors.memoryUtilization = Math.min(1.0, relatedMemories.length / 5);
        }

        // Calculate other factors
        factors.dataFreshness = metadata.dataPoints ? Math.min(1.0, metadata.dataPoints / 100) : 0.5;
        factors.queryComplexity = Math.min(1.0, query.length / 200);
        factors.responseLength = Math.min(1.0, response.length / 1000);
        factors.contextRelevance = relevance;

        // Apply user feedback if available
        let feedbackMultiplier = 1.0;
        if (metadata.userFeedback === 'positive') {
            feedbackMultiplier = 1.2;
        } else if (metadata.userFeedback === 'negative') {
            feedbackMultiplier = 0.7;
        }

        // Calculate overall score
        const overallScore = (
            completeness * 0.25 +
            accuracy * 0.25 +
            relevance * 0.20 +
            clarity * 0.15 +
            timeliness * 0.15
        ) * feedbackMultiplier;

        const confidence = Math.min(1.0, (
            factors.memoryUtilization * 0.3 +
            factors.dataFreshness * 0.3 +
            factors.contextRelevance * 0.4
        ));

        const quality: ResponseQuality = {
            completeness,
            accuracy,
            relevance,
            clarity,
            timeliness,
            overallScore: Math.max(0, Math.min(1, overallScore)),
            confidence,
            factors,
        };

        // Store in quality history for trend analysis
        this.qualityHistory.push(quality);
        if (this.qualityHistory.length > 1000) {
            this.qualityHistory = this.qualityHistory.slice(-1000);
        }

        return quality;
    }

    /**
     * Get contextual insights from learning patterns
     */
    async getContextualInsights(): Promise<ContextualInsight[]> {
        await this.ensureInitialized();

        const insights: ContextualInsight[] = [];
        const patterns = new Map<string, {
            queries: QueryCacheEntry[];
            totalQuality: number;
            issues: string[];
        }>();

        // Analyze query patterns
        for (const [key, entry] of this.queryCache) {
            const pattern = this.extractQueryPattern(entry.originalQuery);

            if (!patterns.has(pattern)) {
                patterns.set(pattern, {
                    queries: [],
                    totalQuality: 0,
                    issues: [],
                });
            }

            const patternData = patterns.get(pattern)!;
            patternData.queries.push(entry);
            patternData.totalQuality += entry.quality.overallScore;

            // Identify common issues
            if (entry.quality.completeness < 0.7) {
                patternData.issues.push('Incomplete responses');
            }
            if (entry.quality.clarity < 0.7) {
                patternData.issues.push('Unclear responses');
            }
            if (entry.quality.timeliness < 0.7) {
                patternData.issues.push('Slow processing');
            }
        }

        // Generate insights
        for (const [pattern, data] of patterns) {
            if (data.queries.length >= 3) { // Only patterns with sufficient data
                const averageQuality = data.totalQuality / data.queries.length;
                const uniqueIssues = Array.from(new Set(data.issues));

                const insight: ContextualInsight = {
                    pattern,
                    frequency: data.queries.length,
                    averageQuality,
                    commonIssues: uniqueIssues,
                    improvementSuggestions: this.generateImprovementSuggestions(uniqueIssues, averageQuality),
                    relatedQueries: data.queries.slice(0, 5).map(q => q.originalQuery),
                };

                insights.push(insight);
            }
        }

        return insights.sort((a, b) => b.frequency - a.frequency);
    }

    /**
     * Get learning metrics and performance statistics
     */
    getLearningMetrics(): LearningMetrics {
        this.updateLearningMetricsCalculations();
        return { ...this.learningMetrics };
    }

    /**
     * Reset learning system (for testing or maintenance)
     */
    async resetLearningSystem(): Promise<void> {
        this.queryCache.clear();
        this.qualityHistory = [];
        this.learningMetrics = {
            totalQueries: 0,
            cacheHits: 0,
            cacheHitRate: 0,
            averageQuality: 0,
            qualityImprovement: 0,
            processingTimeReduction: 0,
            memoryUtilizationRate: 0,
            learningEffectiveness: 0,
        };

        console.log('🔄 Contextual learning system reset');
    }

    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================

    private normalizeQuery(query: string): string {
        return query
            .toLowerCase()
            .trim()
            .replace(/[¿?¡!]/g, '')
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '');
    }

    private isCacheEntryValid(entry: QueryCacheEntry): boolean {
        const age = Date.now() - entry.timestamp;
        return age < this.config.maxCacheAge && entry.quality.overallScore >= this.config.qualityThreshold;
    }

    private async loadCacheFromMemory(): Promise<void> {
        if (!this.memoryManager) return;

        try {
            const memories = await this.memoryManager.searchSimilarMemories({
                query: 'contextual-learning',
                topK: this.config.maxCacheSize,
                categories: ['contextual-learning'],
                includeContext: false,
            });

            for (const memory of memories) {
                if (memory.metadata?.cacheId) {
                    const cacheEntry: QueryCacheEntry = {
                        id: memory.metadata.cacheId,
                        originalQuery: memory.query,
                        normalizedQuery: this.normalizeQuery(memory.query),
                        response: memory.response,
                        quality: {
                            completeness: memory.metadata.quality || 0.5,
                            accuracy: memory.metadata.quality || 0.5,
                            relevance: memory.metadata.quality || 0.5,
                            clarity: memory.metadata.quality || 0.5,
                            timeliness: memory.metadata.quality || 0.5,
                            overallScore: memory.metadata.quality || 0.5,
                            confidence: memory.metadata.quality || 0.5,
                            factors: {
                                memoryUtilization: 0.5,
                                dataFreshness: 0.5,
                                queryComplexity: 0.5,
                                responseLength: 0.5,
                                contextRelevance: 0.5,
                            },
                        },
                        timestamp: memory.timestamp,
                        usageCount: 1,
                        lastUsed: memory.timestamp,
                        metadata: {
                            processingTime: memory.metadata.processingTime || 0,
                            sqlQueries: [],
                        },
                    };

                    this.queryCache.set(cacheEntry.normalizedQuery, cacheEntry);
                }
            }

            console.log(`📚 Loaded ${this.queryCache.size} cache entries from memory`);
        } catch (error) {
            console.warn('⚠️ Failed to load cache from memory:', error);
        }
    }

    private updateLearningMetrics(cacheEntry: QueryCacheEntry): void {
        this.learningMetrics.totalQueries++;

        // Update average quality
        const totalQuality = this.learningMetrics.averageQuality * (this.learningMetrics.totalQueries - 1) +
            cacheEntry.quality.overallScore;
        this.learningMetrics.averageQuality = totalQuality / this.learningMetrics.totalQueries;
    }

    private updateLearningMetricsCalculations(): void {
        if (this.learningMetrics.totalQueries > 0) {
            this.learningMetrics.cacheHitRate = this.learningMetrics.cacheHits / this.learningMetrics.totalQueries;
        }

        // Calculate quality improvement trend
        if (this.qualityHistory.length >= 10) {
            const recent = this.qualityHistory.slice(-10);
            const older = this.qualityHistory.slice(-20, -10);

            if (older.length > 0) {
                const recentAvg = recent.reduce((sum, q) => sum + q.overallScore, 0) / recent.length;
                const olderAvg = older.reduce((sum, q) => sum + q.overallScore, 0) / older.length;
                this.learningMetrics.qualityImprovement = recentAvg - olderAvg;
            }
        }

        // Calculate memory utilization rate
        const memoryUtilizations = Array.from(this.queryCache.values())
            .map(entry => entry.quality.factors.memoryUtilization);

        if (memoryUtilizations.length > 0) {
            this.learningMetrics.memoryUtilizationRate =
                memoryUtilizations.reduce((sum, util) => sum + util, 0) / memoryUtilizations.length;
        }

        // Calculate learning effectiveness
        this.learningMetrics.learningEffectiveness = (
            this.learningMetrics.cacheHitRate * 0.4 +
            this.learningMetrics.averageQuality * 0.3 +
            Math.max(0, this.learningMetrics.qualityImprovement) * 0.3
        );
    }

    private async maintainCacheSize(): Promise<void> {
        if (this.queryCache.size <= this.config.maxCacheSize) return;

        // Sort by usage and quality, remove least valuable entries
        const entries = Array.from(this.queryCache.entries());
        entries.sort(([, a], [, b]) => {
            const scoreA = a.quality.overallScore * 0.6 + (a.usageCount / 10) * 0.4;
            const scoreB = b.quality.overallScore * 0.6 + (b.usageCount / 10) * 0.4;
            return scoreA - scoreB;
        });

        const toRemove = entries.slice(0, this.queryCache.size - this.config.maxCacheSize);
        for (const [key] of toRemove) {
            this.queryCache.delete(key);
        }

        console.log(`🧹 Removed ${toRemove.length} cache entries to maintain size limit`);
    }

    private async calculateQueryResponseRelevance(query: string, response: string): Promise<number> {
        if (!this.embeddingService) return 0.5;

        try {
            const queryEmbedding = await this.embeddingService.transformer.encode(query);
            const responseEmbedding = await this.embeddingService.transformer.encode(response);

            // Calculate cosine similarity
            const similarity = this.cosineSimilarity(queryEmbedding.embedding, responseEmbedding.embedding);
            return Math.max(0, Math.min(1, similarity));
        } catch (error) {
            console.warn('⚠️ Failed to calculate query-response relevance:', error);
            return 0.5;
        }
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }

    private assessResponseClarity(response: string): number {
        let clarity = 0.5;

        // Check for clear structure
        if (response.includes('\n') || response.includes('•') || response.includes('-')) {
            clarity += 0.1;
        }

        // Check for appropriate length
        if (response.length > 50 && response.length < 2000) {
            clarity += 0.1;
        }

        // Check for complete sentences
        const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length > 0) {
            clarity += 0.2;
        }

        // Penalize excessive technical jargon
        const technicalWords = (response.match(/\b(SQL|SELECT|FROM|WHERE|JOIN|DATABASE|TABLE)\b/gi) || []).length;
        if (technicalWords > 5) {
            clarity -= 0.1;
        }

        return Math.max(0, Math.min(1, clarity));
    }

    private identifyMissingInformation(response: string, relatedMemories: MemoryEntry[]): string[] {
        const missingInfo: string[] = [];

        // Analyze what information is commonly included in similar responses
        const commonTopics = new Set<string>();
        for (const memory of relatedMemories) {
            if (memory.response) {
                // Extract key topics (simplified approach)
                const topics = memory.response.match(/\b(usuario|concurso|documento|inscripción|fecha|estado)\w*\b/gi) || [];
                topics.forEach(topic => commonTopics.add(topic.toLowerCase()));
            }
        }

        // Check if current response is missing common topics
        for (const topic of commonTopics) {
            if (!response.toLowerCase().includes(topic)) {
                missingInfo.push(`Información sobre ${topic}`);
            }
        }

        return missingInfo.slice(0, 3); // Limit to top 3 missing items
    }

    private enhanceWithMissingInfo(response: string, missingInfo: string[]): string {
        if (missingInfo.length === 0) return response;

        const enhancement = `\n\nInformación adicional relevante:\n${missingInfo.map(info => `• ${info}`).join('\n')}`;
        return response + enhancement;
    }

    private async improveClarityFromPatterns(response: string): Promise<string[]> {
        const improvements: string[] = [];

        // Analyze successful response patterns from cache
        const highQualityEntries = Array.from(this.queryCache.values())
            .filter(entry => entry.quality.clarity > 0.8)
            .slice(0, 10);

        // Extract common clarity patterns
        const patterns = {
            hasStructure: highQualityEntries.filter(e => e.response.includes('\n')).length / highQualityEntries.length,
            hasBullets: highQualityEntries.filter(e => e.response.includes('•')).length / highQualityEntries.length,
            hasNumbers: highQualityEntries.filter(e => /\d+/.test(e.response)).length / highQualityEntries.length,
        };

        // Apply patterns if beneficial
        if (patterns.hasStructure > 0.6 && !response.includes('\n')) {
            improvements.push('Add structure with line breaks');
        }

        if (patterns.hasBullets > 0.5 && !response.includes('•')) {
            improvements.push('Use bullet points for lists');
        }

        return improvements;
    }

    private applyClarityImprovements(response: string, improvements: string[]): string {
        let improved = response;

        for (const improvement of improvements) {
            if (improvement.includes('structure')) {
                // Add basic structure
                improved = improved.replace(/\. /g, '.\n\n');
            }

            if (improvement.includes('bullet')) {
                // Convert lists to bullet points (simplified)
                improved = improved.replace(/(\d+\.\s)/g, '• ');
            }
        }

        return improved;
    }

    private async findRelevantExamples(query: string): Promise<string[]> {
        if (!this.searchService) return [];

        try {
            const examples = await this.searchService.search({
                query,
                topK: 3,
                minSimilarity: 0.7,
                searchTypes: ['response'],
            });

            return examples
                .filter(example => example.text.length < 200) // Keep examples concise
                .map(example => example.text.substring(0, 150) + '...');
        } catch (error) {
            console.warn('⚠️ Failed to find relevant examples:', error);
            return [];
        }
    }

    private addRelevantExamples(response: string, examples: string[]): string {
        if (examples.length === 0) return response;

        const exampleSection = `\n\nEjemplos relacionados:\n${examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}`;
        return response + exampleSection;
    }

    private extractQueryPattern(query: string): string {
        // Simplified pattern extraction
        const patterns = [
            { regex: /cuántos?\s+\w+/i, pattern: 'count_query' },
            { regex: /lista?\s+\w+/i, pattern: 'list_query' },
            { regex: /qué\s+es/i, pattern: 'definition_query' },
            { regex: /cómo\s+\w+/i, pattern: 'how_to_query' },
            { regex: /dónde\s+\w+/i, pattern: 'location_query' },
            { regex: /cuándo\s+\w+/i, pattern: 'time_query' },
        ];

        for (const { regex, pattern } of patterns) {
            if (regex.test(query)) {
                return pattern;
            }
        }

        return 'general_query';
    }

    private generateImprovementSuggestions(issues: string[], averageQuality: number): string[] {
        const suggestions: string[] = [];

        if (issues.includes('Incomplete responses')) {
            suggestions.push('Provide more comprehensive information');
            suggestions.push('Include relevant context and examples');
        }

        if (issues.includes('Unclear responses')) {
            suggestions.push('Use clearer language and structure');
            suggestions.push('Break down complex information into steps');
        }

        if (issues.includes('Slow processing')) {
            suggestions.push('Optimize query complexity');
            suggestions.push('Use cached results when appropriate');
        }

        if (averageQuality < 0.6) {
            suggestions.push('Review and improve response templates');
            suggestions.push('Enhance memory utilization for better context');
        }

        return suggestions;
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            throw new Error('ContextualLearningSystem not initialized. Call initialize() first.');
        }
    }
}

// Global instance
let globalContextualLearning: ContextualLearningSystem | null = null;

/**
 * Get or create global contextual learning system
 */
export async function getContextualLearningSystem(
    config?: Partial<ContextualLearningConfig>
): Promise<ContextualLearningSystem> {
    if (!globalContextualLearning) {
        globalContextualLearning = new ContextualLearningSystem(config);
    }
    return globalContextualLearning;
}