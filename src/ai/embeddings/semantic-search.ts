// src/ai/embeddings/semantic-search.ts

/**
 * @fileOverview Advanced semantic search service with similarity ranking and context awareness
 */

import { EmbeddingService, MemoryEntry } from './service';
import { VectorStorage, SearchResult } from './storage';
import { SentenceTransformer } from './transformer';

export interface SemanticSearchOptions {
  query: string;
  topK?: number;
  minSimilarity?: number;
  searchTypes?: Array<'query' | 'response' | 'context'>;
  contextWeight?: number;
  temporalWeight?: number;
  categoryFilter?: string[];
  sourceFilter?: string[];
  userFilter?: string;
  sessionFilter?: string;
  timeRange?: {
    start: number;
    end: number;
  };
  boostRecent?: boolean;
  boostImportant?: boolean;
  includeMetadata?: boolean;
}

export interface SemanticSearchResult {
  id: string;
  text: string;
  type: 'query' | 'response' | 'context';
  similarity: number;
  adjustedScore: number;
  rank: number;
  metadata: {
    timestamp: number;
    source?: string;
    category?: string;
    importance?: string;
    userId?: string;
    sessionId?: string;
    [key: string]: any;
  };
  context?: {
    relatedQueries: string[];
    relatedResponses: string[];
    contextSnippets: string[];
  };
}

export interface SearchAnalytics {
  totalSearches: number;
  averageResultCount: number;
  commonQueries: Array<{ query: string; count: number }>;
  searchPatterns: Array<{ pattern: string; frequency: number }>;
  performanceMetrics: {
    averageSearchTime: number;
    slowestSearchTime: number;
    fastestSearchTime: number;
  };
}

/**
 * Advanced semantic search service with intelligent ranking
 */
export class SemanticSearchService {
  private embeddingService!: EmbeddingService;
  private vectorStorage!: VectorStorage;
  private searchAnalytics: SearchAnalytics;
  private initialized = false;

  constructor() {
    this.searchAnalytics = {
      totalSearches: 0,
      averageResultCount: 0,
      commonQueries: [],
      searchPatterns: [],
      performanceMetrics: {
        averageSearchTime: 0,
        slowestSearchTime: 0,
        fastestSearchTime: Infinity,
      },
    };
  }

  /**
   * Initialize the semantic search service
   */
  async initialize(embeddingService: EmbeddingService): Promise<void> {
    if (this.initialized) return;

    this.embeddingService = embeddingService;
    this.vectorStorage = (embeddingService as any).storage;
    this.initialized = true;

    console.log('🔍 Semantic Search Service initialized');
  }

  /**
   * Perform advanced semantic search with intelligent ranking
   */
  async search(options: SemanticSearchOptions): Promise<SemanticSearchResult[]> {
    await this.ensureInitialized();

    const startTime = Date.now();
    const {
      query,
      topK = 10,
      minSimilarity = 0.5,
      searchTypes = ['query', 'response', 'context'],
      contextWeight = 0.3,
      temporalWeight = 0.2,
      categoryFilter,
      sourceFilter,
      userFilter,
      sessionFilter,
      timeRange,
      boostRecent = true,
      boostImportant = true,
      includeMetadata = true,
    } = options;

    console.log(`🔍 Performing semantic search: "${query.substring(0, 50)}..."`);

    // Generate query embedding
    const queryEmbedding = await this.embeddingService.encode(query);

    // Search across all specified types
    const allResults: SearchResult[] = [];

    for (const type of searchTypes) {
      const typeResults = await this.vectorStorage.search(queryEmbedding.embedding, {
        topK: topK * 2, // Get more results for filtering and ranking
        minSimilarity,
        type,
        filter: (doc) => this.applyFilters(doc, {
          categoryFilter,
          sourceFilter,
          userFilter,
          sessionFilter,
          timeRange,
        }),
      });

      allResults.push(...typeResults);
    }

    // Apply intelligent ranking
    const rankedResults = await this.applyIntelligentRanking(
      allResults,
      query,
      {
        contextWeight,
        temporalWeight,
        boostRecent,
        boostImportant,
      }
    );

    // Convert to semantic search results
    const semanticResults: SemanticSearchResult[] = [];

    for (let i = 0; i < Math.min(rankedResults.length, topK); i++) {
      const result = rankedResults[i];
      const doc = result.document;

      const semanticResult: SemanticSearchResult = {
        id: doc.id,
        text: doc.text,
        type: doc.metadata.type as 'query' | 'response' | 'context',
        similarity: result.similarity,
        adjustedScore: (result as any).adjustedScore || result.similarity,
        rank: i + 1,
        metadata: {
          timestamp: doc.metadata.timestamp,
          source: doc.metadata.source,
          category: doc.metadata.category,
          importance: doc.metadata.importance,
          userId: doc.metadata.userId,
          sessionId: doc.metadata.sessionId,
          ...(includeMetadata ? doc.metadata : {}),
        },
      };

      // Add context if requested
      if (includeMetadata) {
        semanticResult.context = await this.buildResultContext(doc, query);
      }

      semanticResults.push(semanticResult);
    }

    // Update analytics
    const searchTime = Date.now() - startTime;
    this.updateSearchAnalytics(query, semanticResults.length, searchTime);

    console.log(`✅ Semantic search completed: ${semanticResults.length} results in ${searchTime}ms`);
    return semanticResults;
  }

  /**
   * Find semantically similar content with clustering
   */
  async findSimilarContent(
    text: string,
    options: {
      topK?: number;
      minSimilarity?: number;
      clusterResults?: boolean;
      includeContext?: boolean;
    } = {}
  ): Promise<{
    results: SemanticSearchResult[];
    clusters?: Array<{
      centroid: string;
      members: SemanticSearchResult[];
      avgSimilarity: number;
    }>;
  }> {
    await this.ensureInitialized();

    const { topK = 20, minSimilarity = 0.6, clusterResults = false, includeContext = true } = options;

    const searchResults = await this.search({
      query: text,
      topK,
      minSimilarity,
      includeMetadata: includeContext,
    });

    if (!clusterResults) {
      return { results: searchResults };
    }

    // Perform clustering on results
    const clusters = await this.clusterResults(searchResults);

    return { results: searchResults, clusters };
  }

  /**
   * Get search suggestions based on query patterns
   */
  async getSearchSuggestions(
    partialQuery: string,
    options: {
      maxSuggestions?: number;
      includePopular?: boolean;
      includeRecent?: boolean;
    } = {}
  ): Promise<string[]> {
    await this.ensureInitialized();

    const { maxSuggestions = 5, includePopular = true, includeRecent = true } = options;
    const suggestions: string[] = [];

    // Get similar queries from memory
    const similarQueries = await this.embeddingService.findSimilarQueries(partialQuery, {
      topK: maxSuggestions * 2,
      minSimilarity: 0.3,
      includeResponses: false,
    });

    // Add similar queries
    for (const memory of similarQueries) {
      if (memory.query.toLowerCase().includes(partialQuery.toLowerCase())) {
        suggestions.push(memory.query);
      }
    }

    // Add popular queries if requested
    if (includePopular) {
      const popularQueries = this.searchAnalytics.commonQueries
        .filter(q => q.query.toLowerCase().includes(partialQuery.toLowerCase()))
        .slice(0, 3)
        .map(q => q.query);

      suggestions.push(...popularQueries);
    }

    // Remove duplicates and limit results
    const uniqueSuggestions = Array.from(new Set(suggestions));
    return uniqueSuggestions.slice(0, maxSuggestions);
  }

  /**
   * Analyze search patterns and trends
   */
  async analyzeSearchPatterns(): Promise<{
    topQueries: Array<{ query: string; count: number; avgSimilarity: number }>;
    searchTrends: Array<{ period: string; searchCount: number; avgResultCount: number }>;
    categoryDistribution: Array<{ category: string; count: number; percentage: number }>;
    performanceInsights: {
      averageSearchTime: number;
      searchVelocity: number;
      qualityScore: number;
    };
  }> {
    await this.ensureInitialized();

    // Analyze query patterns from memory
    const allMemories = await this.embeddingService.exportMemory();
    const queries = allMemories.filter(doc => doc.metadata.type === 'query');

    // Top queries analysis
    const queryFrequency = new Map<string, { count: number; similarities: number[] }>();

    for (const query of queries) {
      const key = query.text.toLowerCase().trim();
      if (!queryFrequency.has(key)) {
        queryFrequency.set(key, { count: 0, similarities: [] });
      }
      const entry = queryFrequency.get(key)!;
      entry.count++;
      if (query.metadata.similarity) {
        entry.similarities.push(query.metadata.similarity);
      }
    }

    const topQueries = Array.from(queryFrequency.entries())
      .map(([query, data]) => ({
        query,
        count: data.count,
        avgSimilarity: data.similarities.length > 0
          ? data.similarities.reduce((a, b) => a + b, 0) / data.similarities.length
          : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Category distribution
    const categoryCount = new Map<string, number>();
    const totalQueries = queries.length;

    for (const query of queries) {
      const category = query.metadata.category || 'uncategorized';
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    }

    const categoryDistribution = Array.from(categoryCount.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: (count / totalQueries) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Performance insights
    const performanceInsights = {
      averageSearchTime: this.searchAnalytics.performanceMetrics.averageSearchTime,
      searchVelocity: this.searchAnalytics.totalSearches / (Date.now() / (24 * 60 * 60 * 1000)), // searches per day
      qualityScore: this.calculateQualityScore(),
    };

    return {
      topQueries,
      searchTrends: [], // Could be implemented with time-series data
      categoryDistribution,
      performanceInsights,
    };
  }

  /**
   * Apply filters to search results
   */
  private applyFilters(
    doc: any,
    filters: {
      categoryFilter?: string[];
      sourceFilter?: string[];
      userFilter?: string;
      sessionFilter?: string;
      timeRange?: { start: number; end: number };
    }
  ): boolean {
    const { categoryFilter, sourceFilter, userFilter, sessionFilter, timeRange } = filters;

    if (categoryFilter && categoryFilter.length > 0) {
      if (!doc.metadata.category || !categoryFilter.includes(doc.metadata.category)) {
        return false;
      }
    }

    if (sourceFilter && sourceFilter.length > 0) {
      if (!doc.metadata.source || !sourceFilter.includes(doc.metadata.source)) {
        return false;
      }
    }

    if (userFilter && doc.metadata.userId !== userFilter) {
      return false;
    }

    if (sessionFilter && doc.metadata.sessionId !== sessionFilter) {
      return false;
    }

    if (timeRange) {
      const timestamp = doc.metadata.timestamp;
      if (timestamp < timeRange.start || timestamp > timeRange.end) {
        return false;
      }
    }

    return true;
  }

  /**
   * Apply intelligent ranking to search results
   */
  private async applyIntelligentRanking(
    results: SearchResult[],
    query: string,
    options: {
      contextWeight: number;
      temporalWeight: number;
      boostRecent: boolean;
      boostImportant: boolean;
    }
  ): Promise<Array<SearchResult & { adjustedScore: number }>> {
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    return results.map(result => {
      let adjustedScore = result.similarity;
      const doc = result.document;

      // Temporal boost for recent content
      if (options.boostRecent) {
        const age = now - doc.metadata.timestamp;
        const recencyBoost = Math.max(0, 1 - (age / maxAge)) * options.temporalWeight;
        adjustedScore += recencyBoost;
      }

      // Importance boost
      if (options.boostImportant) {
        const importance = doc.metadata.importance;
        if (importance === 'high') {
          adjustedScore += 0.2;
        } else if (importance === 'medium') {
          adjustedScore += 0.1;
        }
      }

      // Context type boost
      if (doc.metadata.type === 'context' && doc.metadata.category === 'schema') {
        adjustedScore += options.contextWeight;
      }

      // Query length similarity boost
      const queryLength = query.length;
      const docLength = doc.text.length;
      const lengthSimilarity = 1 - Math.abs(queryLength - docLength) / Math.max(queryLength, docLength);
      adjustedScore += lengthSimilarity * 0.1;

      return {
        ...result,
        adjustedScore: Math.min(adjustedScore, 1.0), // Cap at 1.0
      };
    }).sort((a, b) => b.adjustedScore - a.adjustedScore);
  }

  /**
   * Build context for search results
   */
  private async buildResultContext(
    doc: any,
    query: string
  ): Promise<{
    relatedQueries: string[];
    relatedResponses: string[];
    contextSnippets: string[];
  }> {
    const context = {
      relatedQueries: [] as string[],
      relatedResponses: [] as string[],
      contextSnippets: [] as string[],
    };

    try {
      // Find related content
      const relatedResults = await this.vectorStorage.search(doc.embedding, {
        topK: 5,
        minSimilarity: 0.6,
        filter: (relatedDoc) => relatedDoc.id !== doc.id,
      });

      for (const related of relatedResults) {
        const relatedDoc = related.document;
        const snippet = relatedDoc.text.substring(0, 100) + '...';

        if (relatedDoc.metadata.type === 'query') {
          context.relatedQueries.push(snippet);
        } else if (relatedDoc.metadata.type === 'response') {
          context.relatedResponses.push(snippet);
        } else if (relatedDoc.metadata.type === 'context') {
          context.contextSnippets.push(snippet);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to build result context:', error);
    }

    return context;
  }

  /**
   * Cluster search results by similarity
   */
  private async clusterResults(
    results: SemanticSearchResult[]
  ): Promise<Array<{
    centroid: string;
    members: SemanticSearchResult[];
    avgSimilarity: number;
  }>> {
    if (results.length < 3) return [];

    const clusters: Array<{
      centroid: string;
      members: SemanticSearchResult[];
      avgSimilarity: number;
    }> = [];

    const processed = new Set<string>();

    for (const result of results) {
      if (processed.has(result.id)) continue;

      const cluster = {
        centroid: result.text,
        members: [result],
        avgSimilarity: result.similarity,
      };

      // Find similar results for this cluster
      for (const other of results) {
        if (other.id === result.id || processed.has(other.id)) continue;

        // Simple similarity check (could be improved with actual embedding comparison)
        if (other.similarity >= result.similarity * 0.8) {
          cluster.members.push(other);
          processed.add(other.id);
        }
      }

      if (cluster.members.length > 1) {
        cluster.avgSimilarity = cluster.members.reduce((sum, member) => sum + member.similarity, 0) / cluster.members.length;
        clusters.push(cluster);
      }

      processed.add(result.id);
    }

    return clusters.sort((a, b) => b.avgSimilarity - a.avgSimilarity);
  }

  /**
   * Update search analytics
   */
  private updateSearchAnalytics(query: string, resultCount: number, searchTime: number): void {
    this.searchAnalytics.totalSearches++;

    // Update average result count
    this.searchAnalytics.averageResultCount =
      (this.searchAnalytics.averageResultCount * (this.searchAnalytics.totalSearches - 1) + resultCount) /
      this.searchAnalytics.totalSearches;

    // Update performance metrics
    const metrics = this.searchAnalytics.performanceMetrics;
    metrics.averageSearchTime =
      (metrics.averageSearchTime * (this.searchAnalytics.totalSearches - 1) + searchTime) /
      this.searchAnalytics.totalSearches;

    metrics.slowestSearchTime = Math.max(metrics.slowestSearchTime, searchTime);
    metrics.fastestSearchTime = Math.min(metrics.fastestSearchTime, searchTime);

    // Update common queries
    const existingQuery = this.searchAnalytics.commonQueries.find(q => q.query === query);
    if (existingQuery) {
      existingQuery.count++;
    } else {
      this.searchAnalytics.commonQueries.push({ query, count: 1 });
    }

    // Keep only top 100 common queries
    this.searchAnalytics.commonQueries = this.searchAnalytics.commonQueries
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(): number {
    const avgResultCount = this.searchAnalytics.averageResultCount;
    const avgSearchTime = this.searchAnalytics.performanceMetrics.averageSearchTime;

    // Quality score based on result relevance and performance
    const relevanceScore = Math.min(avgResultCount / 10, 1); // Normalize to 0-1
    const performanceScore = Math.max(0, 1 - (avgSearchTime / 1000)); // Penalize slow searches

    return (relevanceScore + performanceScore) / 2;
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      throw new Error('SemanticSearchService not initialized. Call initialize() first.');
    }
  }

  /**
   * Get search analytics
   */
  getSearchAnalytics(): SearchAnalytics {
    return { ...this.searchAnalytics };
  }

  /**
   * Reset search analytics
   */
  resetSearchAnalytics(): void {
    this.searchAnalytics = {
      totalSearches: 0,
      averageResultCount: 0,
      commonQueries: [],
      searchPatterns: [],
      performanceMetrics: {
        averageSearchTime: 0,
        slowestSearchTime: 0,
        fastestSearchTime: Infinity,
      },
    };
  }
}

// Global instance
let globalSemanticSearch: SemanticSearchService | null = null;

/**
 * Get or create global semantic search service
 */
export async function getSemanticSearchService(): Promise<SemanticSearchService> {
  if (!globalSemanticSearch) {
    globalSemanticSearch = new SemanticSearchService();
  }
  return globalSemanticSearch;
}