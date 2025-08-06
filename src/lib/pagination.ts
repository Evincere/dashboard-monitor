// src/lib/pagination.ts

/**
 * @fileOverview Advanced pagination utilities for large datasets
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextPage: number | null;
    previousPage: number | null;
  };
  meta: {
    executionTime: number;
    cached: boolean;
    query?: string;
  };
}

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface CursorPaginationResult<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    previousCursor: string | null;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    itemsPerPage: number;
  };
  meta: {
    executionTime: number;
    cached: boolean;
    query?: string;
  };
}

/**
 * Advanced pagination utility class
 */
export class PaginationHelper {
  private defaultLimit = 20;
  private maxLimit = 100;

  /**
   * Create offset-based pagination query
   */
  createOffsetQuery(
    baseQuery: string,
    params: PaginationParams,
    countQuery?: string
  ): {
    dataQuery: string;
    countQuery: string;
    queryParams: any[];
    pagination: { offset: number; limit: number };
  } {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(this.maxLimit, Math.max(1, params.limit || this.defaultLimit));
    const offset = (page - 1) * limit;

    let dataQuery = baseQuery;
    let finalCountQuery = countQuery || this.generateCountQuery(baseQuery);
    const queryParams: any[] = [];

    // Add search conditions
    if (params.search) {
      const searchCondition = this.buildSearchCondition(params.search);
      dataQuery = this.addWhereCondition(dataQuery, searchCondition.condition);
      finalCountQuery = this.addWhereCondition(finalCountQuery, searchCondition.condition);
      queryParams.push(...searchCondition.params);
    }

    // Add filters
    if (params.filters) {
      const filterConditions = this.buildFilterConditions(params.filters);
      if (filterConditions.condition) {
        dataQuery = this.addWhereCondition(dataQuery, filterConditions.condition);
        finalCountQuery = this.addWhereCondition(finalCountQuery, filterConditions.condition);
        queryParams.push(...filterConditions.params);
      }
    }

    // Add sorting
    if (params.sortBy) {
      const sortOrder = params.sortOrder || 'asc';
      dataQuery += ` ORDER BY ${this.sanitizeColumnName(params.sortBy)} ${sortOrder.toUpperCase()}`;
    }

    // Add pagination
    dataQuery += ` LIMIT ${limit} OFFSET ${offset}`;

    return {
      dataQuery,
      countQuery: finalCountQuery,
      queryParams,
      pagination: { offset, limit }
    };
  }

  /**
   * Create cursor-based pagination query (better for large datasets)
   */
  createCursorQuery(
    baseQuery: string,
    params: CursorPaginationParams,
    cursorColumn: string = 'id'
  ): {
    dataQuery: string;
    queryParams: any[];
    pagination: { limit: number; cursor?: any };
  } {
    const limit = Math.min(this.maxLimit, Math.max(1, params.limit || this.defaultLimit));
    let dataQuery = baseQuery;
    const queryParams: any[] = [];

    // Add search conditions
    if (params.search) {
      const searchCondition = this.buildSearchCondition(params.search);
      dataQuery = this.addWhereCondition(dataQuery, searchCondition.condition);
      queryParams.push(...searchCondition.params);
    }

    // Add filters
    if (params.filters) {
      const filterConditions = this.buildFilterConditions(params.filters);
      if (filterConditions.condition) {
        dataQuery = this.addWhereCondition(dataQuery, filterConditions.condition);
        queryParams.push(...filterConditions.params);
      }
    }

    // Add cursor condition
    let cursor: any = null;
    if (params.cursor) {
      try {
        cursor = this.decodeCursor(params.cursor);
        const sortOrder = params.sortOrder || 'asc';
        const operator = sortOrder === 'asc' ? '>' : '<';
        dataQuery = this.addWhereCondition(dataQuery, `${cursorColumn} ${operator} ?`);
        queryParams.push(cursor);
      } catch (error) {
        console.warn('[Pagination] Invalid cursor:', error);
      }
    }

    // Add sorting
    const sortBy = params.sortBy || cursorColumn;
    const sortOrder = params.sortOrder || 'asc';
    dataQuery += ` ORDER BY ${this.sanitizeColumnName(sortBy)} ${sortOrder.toUpperCase()}`;

    // Add limit (fetch one extra to check if there's a next page)
    dataQuery += ` LIMIT ${limit + 1}`;

    return {
      dataQuery,
      queryParams,
      pagination: { limit, cursor }
    };
  }

  /**
   * Process offset pagination results
   */
  processOffsetResults<T>(
    data: T[],
    totalCount: number,
    params: PaginationParams,
    executionTime: number,
    cached: boolean = false,
    query?: string
  ): PaginationResult<T> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(this.maxLimit, Math.max(1, params.limit || this.defaultLimit));
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        previousPage: page > 1 ? page - 1 : null
      },
      meta: {
        executionTime,
        cached,
        query
      }
    };
  }

  /**
   * Process cursor pagination results
   */
  processCursorResults<T>(
    data: T[],
    params: CursorPaginationParams,
    cursorColumn: string,
    executionTime: number,
    cached: boolean = false,
    query?: string
  ): CursorPaginationResult<T> {
    const limit = Math.min(this.maxLimit, Math.max(1, params.limit || this.defaultLimit));
    const hasNextPage = data.length > limit;
    
    // Remove the extra item used for next page detection
    if (hasNextPage) {
      data.pop();
    }

    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    if (data.length > 0) {
      // Create next cursor from last item
      if (hasNextPage) {
        const lastItem = data[data.length - 1] as any;
        nextCursor = this.encodeCursor(lastItem[cursorColumn]);
      }

      // Create previous cursor from first item (simplified)
      if (params.cursor) {
        const firstItem = data[0] as any;
        previousCursor = this.encodeCursor(firstItem[cursorColumn]);
      }
    }

    return {
      data,
      pagination: {
        nextCursor,
        previousCursor,
        hasNextPage,
        hasPreviousPage: !!params.cursor,
        itemsPerPage: limit
      },
      meta: {
        executionTime,
        cached,
        query
      }
    };
  }

  /**
   * Build search condition for text search
   */
  private buildSearchCondition(search: string): { condition: string; params: any[] } {
    // Simple text search - in practice, you might want full-text search
    const searchTerm = `%${search}%`;
    return {
      condition: '(name LIKE ? OR email LIKE ? OR description LIKE ?)',
      params: [searchTerm, searchTerm, searchTerm]
    };
  }

  /**
   * Build filter conditions from filter object
   */
  private buildFilterConditions(filters: Record<string, any>): { condition: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined) continue;

      const sanitizedKey = this.sanitizeColumnName(key);

      if (Array.isArray(value)) {
        // IN clause for arrays
        const placeholders = value.map(() => '?').join(', ');
        conditions.push(`${sanitizedKey} IN (${placeholders})`);
        params.push(...value);
      } else if (typeof value === 'object' && value.operator) {
        // Complex filter with operator
        const operator = this.sanitizeOperator(value.operator);
        conditions.push(`${sanitizedKey} ${operator} ?`);
        params.push(value.value);
      } else {
        // Simple equality
        conditions.push(`${sanitizedKey} = ?`);
        params.push(value);
      }
    }

    return {
      condition: conditions.join(' AND '),
      params
    };
  }

  /**
   * Add WHERE condition to query
   */
  private addWhereCondition(query: string, condition: string): string {
    if (!condition) return query;

    const upperQuery = query.toUpperCase();
    if (upperQuery.includes(' WHERE ')) {
      return query + ` AND (${condition})`;
    } else {
      return query + ` WHERE ${condition}`;
    }
  }

  /**
   * Generate count query from base query
   */
  private generateCountQuery(baseQuery: string): string {
    // Simple approach - replace SELECT clause with COUNT(*)
    const selectIndex = baseQuery.toUpperCase().indexOf('SELECT');
    const fromIndex = baseQuery.toUpperCase().indexOf('FROM');
    
    if (selectIndex === -1 || fromIndex === -1) {
      throw new Error('Invalid query format for count generation');
    }

    return `SELECT COUNT(*) as total ${baseQuery.substring(fromIndex)}`;
  }

  /**
   * Sanitize column name to prevent SQL injection
   */
  private sanitizeColumnName(columnName: string): string {
    // Allow only alphanumeric characters, underscores, and dots
    return columnName.replace(/[^a-zA-Z0-9_.]/g, '');
  }

  /**
   * Sanitize operator to prevent SQL injection
   */
  private sanitizeOperator(operator: string): string {
    const allowedOperators = ['=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'NOT LIKE'];
    const upperOperator = operator.toUpperCase();
    
    if (allowedOperators.includes(upperOperator)) {
      return upperOperator;
    }
    
    return '='; // Default to equality
  }

  /**
   * Encode cursor value
   */
  private encodeCursor(value: any): string {
    return Buffer.from(JSON.stringify(value)).toString('base64');
  }

  /**
   * Decode cursor value
   */
  private decodeCursor(cursor: string): any {
    return JSON.parse(Buffer.from(cursor, 'base64').toString());
  }
}

// Global pagination helper instance
export const paginationHelper = new PaginationHelper();

/**
 * Lazy loading utility for infinite scroll
 */
export class LazyLoader<T> {
  private data: T[] = [];
  private loading = false;
  private hasMore = true;
  private currentCursor: string | null = null;

  constructor(
    private fetchFunction: (cursor?: string) => Promise<CursorPaginationResult<T>>,
    private pageSize: number = 20
  ) {}

  /**
   * Load next batch of data
   */
  async loadNext(): Promise<T[]> {
    if (this.loading || !this.hasMore) {
      return [];
    }

    this.loading = true;

    try {
      const result = await this.fetchFunction(this.currentCursor || undefined);
      
      this.data.push(...result.data);
      this.currentCursor = result.pagination.nextCursor;
      this.hasMore = result.pagination.hasNextPage;
      
      return result.data;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Reset loader state
   */
  reset(): void {
    this.data = [];
    this.currentCursor = null;
    this.hasMore = true;
    this.loading = false;
  }

  /**
   * Get current data
   */
  getData(): T[] {
    return [...this.data];
  }

  /**
   * Get loader state
   */
  getState(): {
    loading: boolean;
    hasMore: boolean;
    totalLoaded: number;
  } {
    return {
      loading: this.loading,
      hasMore: this.hasMore,
      totalLoaded: this.data.length
    };
  }
}