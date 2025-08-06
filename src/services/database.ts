// src/services/database.ts

/**
 * @fileOverview Advanced database connection service with optimized connection pooling
 */

import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

// Performance monitoring
interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  queuedRequests: number;
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
}

let queryStats = {
  totalQueries: 0,
  totalTime: 0,
  slowQueries: 0
};

/**
 * Get optimized database connection pool
 */
function getConnectionPool(): mysql.Pool {
  if (!pool) {
    const poolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'mpd_concursos',
      
      // Optimized connection pool settings
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '20'),
      acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000'),
      timeout: parseInt(process.env.DB_TIMEOUT || '30000'),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '300000'), // 5 minutes
      
      // Connection management
      waitForConnections: true,
      queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '50'),
      reconnect: true,
      
      // Performance optimizations
      multipleStatements: false,
      dateStrings: false,
      supportBigNumbers: true,
      bigNumberStrings: false,
      
      // SSL configuration for production
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false,
      
      // Character set
      charset: 'utf8mb4'
    };

    pool = mysql.createPool(poolConfig);

    // Pool event listeners for monitoring
    pool.on('connection', (connection) => {
      console.log(`[DB] New connection established as id ${connection.threadId}`);
    });

    pool.on('error', (err) => {
      console.error('[DB] Pool error:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('[DB] Attempting to reconnect...');
      }
    });

    pool.on('release', (connection) => {
      console.log(`[DB] Connection ${connection.threadId} released`);
    });
  }
  return pool;
}

/**
 * Get database connection from pool
 */
export async function getDatabaseConnection(): Promise<mysql.PoolConnection> {
  const connectionPool = getConnectionPool();
  return await connectionPool.getConnection();
}

/**
 * Execute query with automatic connection management and performance monitoring
 */
export async function executeQuery(query: string, params?: any[]): Promise<any> {
  const startTime = Date.now();
  const connection = await getDatabaseConnection();
  let success = true;
  let error: string | undefined;
  
  try {
    const result = await connection.execute(query, params);
    
    // Performance monitoring
    const queryTime = Date.now() - startTime;
    queryStats.totalQueries++;
    queryStats.totalTime += queryTime;
    
    // Log slow queries (> 1 second)
    const slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000');
    if (queryTime > slowQueryThreshold) {
      queryStats.slowQueries++;
      console.warn(`[DB] Slow query detected (${queryTime}ms):`, query.substring(0, 100));
    }

    // Record performance metrics if monitoring is enabled
    if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
      try {
        const { performanceMonitor } = await import('../lib/performance-monitor');
        performanceMonitor.recordQuery(query, queryTime, success, error);
      } catch (monitorError) {
        // Don't fail the query if monitoring fails
        console.warn('[DB] Performance monitoring error:', monitorError);
      }
    }
    
    return result;
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : 'Unknown database error';
    
    // Record failed query metrics
    if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
      try {
        const queryTime = Date.now() - startTime;
        const { performanceMonitor } = await import('../lib/performance-monitor');
        performanceMonitor.recordQuery(query, queryTime, success, error);
      } catch (monitorError) {
        console.warn('[DB] Performance monitoring error:', monitorError);
      }
    }
    
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Execute query with transaction support
 */
export async function executeTransaction(queries: Array<{ query: string; params?: any[] }>): Promise<any[]> {
  const connection = await getDatabaseConnection();
  
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params } of queries) {
      const result = await connection.execute(query, params);
      results.push(result);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Execute prepared statement for better performance
 */
export async function executePreparedStatement(query: string, params?: any[]): Promise<any> {
  const connection = await getDatabaseConnection();
  
  try {
    const statement = await connection.prepare(query);
    const result = await statement.execute(params);
    await statement.close();
    return result;
  } finally {
    connection.release();
  }
}

/**
 * Get database pool statistics
 */
export function getPoolStats(): PoolStats {
  if (!pool) {
    return {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      queuedRequests: 0,
      totalQueries: queryStats.totalQueries,
      averageQueryTime: queryStats.totalQueries > 0 ? queryStats.totalTime / queryStats.totalQueries : 0,
      slowQueries: queryStats.slowQueries
    };
  }

  return {
    totalConnections: (pool as any)._allConnections?.length || 0,
    activeConnections: (pool as any)._acquiringConnections?.length || 0,
    idleConnections: (pool as any)._freeConnections?.length || 0,
    queuedRequests: (pool as any)._connectionQueue?.length || 0,
    totalQueries: queryStats.totalQueries,
    averageQueryTime: queryStats.totalQueries > 0 ? queryStats.totalTime / queryStats.totalQueries : 0,
    slowQueries: queryStats.slowQueries
  };
}

/**
 * Reset query statistics
 */
export function resetQueryStats(): void {
  queryStats = {
    totalQueries: 0,
    totalTime: 0,
    slowQueries: 0
  };
}

/**
 * Close database connection pool
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}