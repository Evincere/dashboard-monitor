// src/lib/query-optimizer.ts

/**
 * @fileOverview SQL query optimization and analysis service
 */

import { executeQuery } from '../services/database';

interface QueryAnalysis {
  query: string;
  executionTime: number;
  rowsExamined: number;
  rowsReturned: number;
  useIndex: boolean;
  suggestions: string[];
  optimizedQuery?: string;
}

interface IndexSuggestion {
  table: string;
  columns: string[];
  type: 'single' | 'composite' | 'covering';
  reason: string;
  estimatedImprovement: string;
}

class QueryOptimizer {
  private queryCache = new Map<string, QueryAnalysis>();
  private indexSuggestions = new Map<string, IndexSuggestion[]>();

  /**
   * Analyze query performance and suggest optimizations
   */
  async analyzeQuery(query: string): Promise<QueryAnalysis> {
    const cacheKey = this.hashQuery(query);
    
    // Check cache first
    if (this.queryCache.has(cacheKey)) {
      return this.queryCache.get(cacheKey)!;
    }

    const analysis = await this.performQueryAnalysis(query);
    
    // Cache the analysis
    this.queryCache.set(cacheKey, analysis);
    
    return analysis;
  }

  /**
   * Perform detailed query analysis
   */
  private async performQueryAnalysis(query: string): Promise<QueryAnalysis> {
    const startTime = Date.now();
    let rowsExamined = 0;
    let rowsReturned = 0;
    let useIndex = false;
    const suggestions: string[] = [];

    try {
      // Get query execution plan
      const explainQuery = `EXPLAIN FORMAT=JSON ${query}`;
      const [explainResult] = await executeQuery(explainQuery);
      const plan = JSON.parse(explainResult[0]['EXPLAIN']);

      // Analyze execution plan
      const queryBlock = plan.query_block;
      if (queryBlock) {
        rowsExamined = queryBlock.cost_info?.read_cost || 0;
        useIndex = this.hasIndexUsage(queryBlock);
        
        // Generate suggestions based on plan
        suggestions.push(...this.generateSuggestionsFromPlan(queryBlock, query));
      }

      // Execute query to get actual results
      const [results] = await executeQuery(query);
      rowsReturned = Array.isArray(results) ? results.length : 1;

    } catch (error) {
      console.warn('[QueryOptimizer] Analysis failed:', error);
      suggestions.push('Query analysis failed - check syntax and permissions');
    }

    const executionTime = Date.now() - startTime;

    // Generate general optimization suggestions
    suggestions.push(...this.generateGeneralSuggestions(query));

    return {
      query,
      executionTime,
      rowsExamined,
      rowsReturned,
      useIndex,
      suggestions: [...new Set(suggestions)], // Remove duplicates
      optimizedQuery: this.generateOptimizedQuery(query, suggestions)
    };
  }

  /**
   * Check if query plan uses indexes
   */
  private hasIndexUsage(queryBlock: any): boolean {
    if (queryBlock.table?.key) {
      return queryBlock.table.key !== 'PRIMARY';
    }
    
    if (queryBlock.nested_loop) {
      return queryBlock.nested_loop.some((table: any) => table.table?.key);
    }

    return false;
  }

  /**
   * Generate suggestions from execution plan
   */
  private generateSuggestionsFromPlan(queryBlock: any, query: string): string[] {
    const suggestions: string[] = [];

    // Check for full table scans
    if (queryBlock.table?.access_type === 'ALL') {
      suggestions.push('Consider adding an index - full table scan detected');
    }

    // Check for filesort
    if (queryBlock.ordering_operation?.using_filesort) {
      suggestions.push('Consider adding an index for ORDER BY clause to avoid filesort');
    }

    // Check for temporary tables
    if (queryBlock.ordering_operation?.using_temporary_table) {
      suggestions.push('Query uses temporary table - consider optimizing GROUP BY or DISTINCT');
    }

    // Check for high cost
    const cost = queryBlock.cost_info?.query_cost || 0;
    if (cost > 1000) {
      suggestions.push('High query cost detected - consider adding indexes or limiting results');
    }

    return suggestions;
  }

  /**
   * Generate general optimization suggestions
   */
  private generateGeneralSuggestions(query: string): string[] {
    const suggestions: string[] = [];
    const upperQuery = query.toUpperCase();

    // Check for SELECT *
    if (upperQuery.includes('SELECT *')) {
      suggestions.push('Avoid SELECT * - specify only needed columns');
    }

    // Check for missing LIMIT
    if (upperQuery.includes('SELECT') && !upperQuery.includes('LIMIT') && !upperQuery.includes('COUNT')) {
      suggestions.push('Consider adding LIMIT clause to prevent large result sets');
    }

    // Check for OR conditions
    if (upperQuery.includes(' OR ')) {
      suggestions.push('OR conditions can be slow - consider using UNION or IN clause');
    }

    // Check for LIKE with leading wildcard
    if (upperQuery.includes("LIKE '%")) {
      suggestions.push('Leading wildcards in LIKE prevent index usage - consider full-text search');
    }

    // Check for functions in WHERE clause
    if (upperQuery.match(/WHERE.*\w+\(/)) {
      suggestions.push('Functions in WHERE clause prevent index usage - consider computed columns');
    }

    // Check for subqueries
    if (upperQuery.includes('SELECT') && upperQuery.match(/\(.*SELECT/)) {
      suggestions.push('Consider converting subqueries to JOINs for better performance');
    }

    return suggestions;
  }

  /**
   * Generate optimized version of query
   */
  private generateOptimizedQuery(query: string, suggestions: string[]): string | undefined {
    let optimized = query;
    let hasChanges = false;

    // Replace SELECT * with specific columns (basic implementation)
    if (optimized.toUpperCase().includes('SELECT *')) {
      // This is a simplified optimization - in practice, you'd need to know the table structure
      optimized = optimized.replace(/SELECT \*/gi, 'SELECT id, name, created_at');
      hasChanges = true;
    }

    // Add LIMIT if missing (for SELECT queries without COUNT)
    if (optimized.toUpperCase().includes('SELECT') && 
        !optimized.toUpperCase().includes('LIMIT') && 
        !optimized.toUpperCase().includes('COUNT')) {
      optimized += ' LIMIT 100';
      hasChanges = true;
    }

    return hasChanges ? optimized : undefined;
  }

  /**
   * Suggest indexes for better performance
   */
  async suggestIndexes(tableName: string): Promise<IndexSuggestion[]> {
    const cacheKey = `indexes_${tableName}`;
    
    if (this.indexSuggestions.has(cacheKey)) {
      return this.indexSuggestions.get(cacheKey)!;
    }

    const suggestions = await this.analyzeTableForIndexes(tableName);
    this.indexSuggestions.set(cacheKey, suggestions);
    
    return suggestions;
  }

  /**
   * Analyze table for index opportunities
   */
  private async analyzeTableForIndexes(tableName: string): Promise<IndexSuggestion[]> {
    const suggestions: IndexSuggestion[] = [];

    try {
      // Get table structure
      const [columns] = await executeQuery(`DESCRIBE ${tableName}`);
      
      // Get existing indexes
      const [indexes] = await executeQuery(`SHOW INDEX FROM ${tableName}`);
      const existingIndexes = new Set(indexes.map((idx: any) => idx.Column_name));

      // Analyze columns for index opportunities
      for (const column of columns) {
        const columnName = column.Field;
        
        // Skip if already indexed
        if (existingIndexes.has(columnName)) continue;

        // Suggest indexes based on column type and name patterns
        if (columnName.endsWith('_id') || columnName === 'id') {
          suggestions.push({
            table: tableName,
            columns: [columnName],
            type: 'single',
            reason: 'Foreign key or ID column',
            estimatedImprovement: 'High - improves JOIN and WHERE performance'
          });
        }

        if (columnName.includes('email') || columnName.includes('username')) {
          suggestions.push({
            table: tableName,
            columns: [columnName],
            type: 'single',
            reason: 'Frequently searched unique identifier',
            estimatedImprovement: 'High - improves login and search performance'
          });
        }

        if (columnName.includes('status') || columnName.includes('type')) {
          suggestions.push({
            table: tableName,
            columns: [columnName],
            type: 'single',
            reason: 'Frequently filtered categorical column',
            estimatedImprovement: 'Medium - improves filtering performance'
          });
        }

        if (columnName.includes('created_at') || columnName.includes('updated_at')) {
          suggestions.push({
            table: tableName,
            columns: [columnName],
            type: 'single',
            reason: 'Date column for time-based queries',
            estimatedImprovement: 'Medium - improves date range queries'
          });
        }
      }

      // Suggest composite indexes for common patterns
      const dateColumns = columns.filter((col: any) => 
        col.Field.includes('created_at') || col.Field.includes('updated_at')
      );
      const statusColumns = columns.filter((col: any) => 
        col.Field.includes('status') || col.Field.includes('type')
      );

      if (dateColumns.length > 0 && statusColumns.length > 0) {
        suggestions.push({
          table: tableName,
          columns: [statusColumns[0].Field, dateColumns[0].Field],
          type: 'composite',
          reason: 'Common filtering pattern: status + date',
          estimatedImprovement: 'High - improves complex WHERE clauses'
        });
      }

    } catch (error) {
      console.warn('[QueryOptimizer] Index analysis failed:', error);
    }

    return suggestions;
  }

  /**
   * Get performance recommendations for the entire database
   */
  async getDatabaseRecommendations(): Promise<{
    slowQueries: QueryAnalysis[];
    indexSuggestions: { table: string; suggestions: IndexSuggestion[] }[];
    generalRecommendations: string[];
  }> {
    const slowQueries = Array.from(this.queryCache.values())
      .filter(analysis => analysis.executionTime > 1000)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    const indexSuggestions: { table: string; suggestions: IndexSuggestion[] }[] = [];
    
    // Get table list and analyze each
    try {
      const [tables] = await executeQuery('SHOW TABLES');
      for (const table of tables.slice(0, 5)) { // Limit to first 5 tables
        const tableName = Object.values(table)[0] as string;
        const suggestions = await this.suggestIndexes(tableName);
        if (suggestions.length > 0) {
          indexSuggestions.push({ table: tableName, suggestions });
        }
      }
    } catch (error) {
      console.warn('[QueryOptimizer] Failed to get table list:', error);
    }

    const generalRecommendations = [
      'Enable query cache for repeated queries',
      'Monitor slow query log regularly',
      'Consider partitioning large tables',
      'Optimize MySQL configuration for your workload',
      'Regular ANALYZE TABLE to update statistics',
      'Consider read replicas for heavy read workloads'
    ];

    return {
      slowQueries,
      indexSuggestions,
      generalRecommendations
    };
  }

  /**
   * Hash query for caching
   */
  private hashQuery(query: string): string {
    // Simple hash function for query caching
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.queryCache.clear();
    this.indexSuggestions.clear();
  }
}

// Global query optimizer instance
export const queryOptimizer = new QueryOptimizer();