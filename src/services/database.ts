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
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '300000'), // 5 minutes
      
      // Connection management
      waitForConnections: true,
      queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '50'),
      
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
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<any> {
  try {
    const connection = await getDatabaseConnection();
    
    // Test basic connectivity
    const [result] = await connection.execute('SELECT 1 as test, NOW() as current_time, DATABASE() as database_name');
    
    // Get basic database info
    const [dbInfo] = await connection.execute(`
      SELECT 
        VERSION() as mysql_version,
        @@character_set_database as charset,
        @@collation_database as collation,
        COUNT(*) as table_count
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `);
    
    connection.release();
    
    return {
      connection: 'successful',
      test_query: result[0],
      database_info: dbInfo[0],
      pool_stats: getPoolStats()
    };
  } catch (error) {
    console.error('[DB] Database connection test failed:', error);
    throw error;
  }
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
/**

 * Get complete database schema
 */
export async function getDbSchema(forceRefresh = false): Promise<any> {
  try {
    const connection = await getDatabaseConnection();
    
    // Get all tables
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_COMMENT, ENGINE, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);

    const schema = {
      database: process.env.DB_DATABASE || 'mpd_concursos',
      tables: [],
      lastIntrospection: new Date().toISOString()
    };

    // Get detailed info for each table
    for (const table of tables as any[]) {
      const tableName = table.TABLE_NAME;
      
      // Get columns
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA, COLUMN_COMMENT
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [tableName]);

      // Get foreign keys
      const [foreignKeys] = await connection.execute(`
        SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [tableName]);

      // Get indexes
      const [indexes] = await connection.execute(`
        SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE, INDEX_TYPE
        FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        ORDER BY INDEX_NAME, SEQ_IN_INDEX
      `, [tableName]);

      schema.tables.push({
        name: tableName,
        comment: table.TABLE_COMMENT,
        engine: table.ENGINE,
        rows: table.TABLE_ROWS,
        dataLength: table.DATA_LENGTH,
        indexLength: table.INDEX_LENGTH,
        columns: columns,
        foreignKeys: foreignKeys,
        indexes: indexes
      });
    }

    connection.release();
    return schema;
  } catch (error) {
    console.error('[DB] Error getting database schema:', error);
    throw error;
  }
}

/**
 * Get schema overview with basic statistics
 */
export async function getSchemaOverview(): Promise<any> {
  try {
    const connection = await getDatabaseConnection();
    
    const [overview] = await connection.execute(`
      SELECT 
        COUNT(*) as total_tables,
        SUM(TABLE_ROWS) as total_rows,
        SUM(DATA_LENGTH) as total_data_size,
        SUM(INDEX_LENGTH) as total_index_size
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `);

    connection.release();
    return overview[0];
  } catch (error) {
    console.error('[DB] Error getting schema overview:', error);
    throw error;
  }
}

/**
 * Get database metadata
 */
export async function getDatabaseMetadata(): Promise<any> {
  try {
    const connection = await getDatabaseConnection();
    
    const [metadata] = await connection.execute(`
      SELECT 
        SCHEMA_NAME as database_name,
        DEFAULT_CHARACTER_SET_NAME as charset,
        DEFAULT_COLLATION_NAME as collation
      FROM information_schema.SCHEMATA 
      WHERE SCHEMA_NAME = DATABASE()
    `);

    connection.release();
    return metadata[0];
  } catch (error) {
    console.error('[DB] Error getting database metadata:', error);
    throw error;
  }
}

/**
 * Validate schema integrity
 */
export async function validateSchemaIntegrity(): Promise<any> {
  try {
    const connection = await getDatabaseConnection();
    
    // Check for orphaned foreign keys
    const [orphanedFKs] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND REFERENCED_TABLE_NAME IS NOT NULL
        AND REFERENCED_TABLE_NAME NOT IN (
          SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()
        )
    `);

    connection.release();
    return {
      orphanedForeignKeys: orphanedFKs,
      isValid: (orphanedFKs as any[]).length === 0
    };
  } catch (error) {
    console.error('[DB] Error validating schema integrity:', error);
    throw error;
  }
}

/**
 * Analyze table storage
 */
export async function analyzeTableStorage(): Promise<any> {
  try {
    const connection = await getDatabaseConnection();
    
    const [storage] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        ENGINE,
        TABLE_ROWS,
        AVG_ROW_LENGTH,
        DATA_LENGTH,
        INDEX_LENGTH,
        DATA_FREE,
        ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS total_size_mb
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
    `);

    connection.release();
    return storage;
  } catch (error) {
    console.error('[DB] Error analyzing table storage:', error);
    throw error;
  }
}

/**
 * Get table constraints
 */
export async function getTableConstraints(tableName?: string): Promise<any> {
  try {
    const connection = await getDatabaseConnection();
    
    let query = `
      SELECT 
        TABLE_NAME,
        CONSTRAINT_NAME,
        CONSTRAINT_TYPE
      FROM information_schema.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = DATABASE()
    `;
    
    const params = [];
    if (tableName) {
      query += ' AND TABLE_NAME = ?';
      params.push(tableName);
    }
    
    query += ' ORDER BY TABLE_NAME, CONSTRAINT_TYPE';
    
    const [constraints] = await connection.execute(query, params);
    
    connection.release();
    return constraints;
  } catch (error) {
    console.error('[DB] Error getting table constraints:', error);
    throw error;
  }
}

/**
 * Get table privileges
 */
export async function getTablePrivileges(tableName?: string): Promise<any> {
  try {
    const connection = await getDatabaseConnection();
    
    let query = `
      SELECT 
        TABLE_NAME,
        PRIVILEGE_TYPE,
        GRANTEE
      FROM information_schema.TABLE_PRIVILEGES 
      WHERE TABLE_SCHEMA = DATABASE()
    `;
    
    const params = [];
    if (tableName) {
      query += ' AND TABLE_NAME = ?';
      params.push(tableName);
    }
    
    const [privileges] = await connection.execute(query, params);
    
    connection.release();
    return privileges;
  } catch (error) {
    console.error('[DB] Error getting table privileges:', error);
    throw error;
  }
}

/**
 * Get table triggers
 */
export async function getTableTriggers(tableName?: string): Promise<any> {
  try {
    const connection = await getDatabaseConnection();
    
    let query = `
      SELECT 
        TRIGGER_NAME,
        EVENT_MANIPULATION,
        EVENT_OBJECT_TABLE,
        ACTION_TIMING,
        ACTION_STATEMENT
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = DATABASE()
    `;
    
    const params = [];
    if (tableName) {
      query += ' AND EVENT_OBJECT_TABLE = ?';
      params.push(tableName);
    }
    
    const [triggers] = await connection.execute(query, params);
    
    connection.release();
    return triggers;
  } catch (error) {
    console.error('[DB] Error getting table triggers:', error);
    throw error;
  }
}

/**
 * Get table schema details
 */
export async function getTableSchema(tableName: string): Promise<any> {
  try {
    const connection = await getDatabaseConnection();
    
    const [columns] = await connection.execute(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY,
        EXTRA,
        COLUMN_COMMENT,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [tableName]);

    connection.release();
    return columns;
  } catch (error) {
    console.error('[DB] Error getting table schema:', error);
    throw error;
  }
}

/**
 * Get table foreign keys
 */
export async function getTableForeignKeys(tableName: string): Promise<any> {
  try {
    const connection = await getDatabaseConnection();
    
    const [foreignKeys] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME,
        UPDATE_RULE,
        DELETE_RULE
      FROM information_schema.KEY_COLUMN_USAGE kcu
      JOIN information_schema.REFERENTIAL_CONSTRAINTS rc 
        ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
      WHERE kcu.TABLE_SCHEMA = DATABASE() 
        AND kcu.TABLE_NAME = ?
        AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    `, [tableName]);

    connection.release();
    return foreignKeys;
  } catch (error) {
    console.error('[DB] Error getting table foreign keys:', error);
    throw error;
  }
}

/**
 * Get table indexes
 */
export async function getTableIndexes(tableName: string): Promise<any> {
  try {
    const connection = await getDatabaseConnection();
    
    const [indexes] = await connection.execute(`
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        INDEX_TYPE,
        SEQ_IN_INDEX,
        CARDINALITY
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [tableName]);

    connection.release();
    return indexes;
  } catch (error) {
    console.error('[DB] Error getting table indexes:', error);
    throw error;
  }
}

/**
 * Get table primary key
 */
export async function getTablePrimaryKey(tableName: string): Promise<any> {
  try {
    const connection = await getDatabaseConnection();
    
    const [primaryKey] = await connection.execute(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND COLUMN_KEY = 'PRI'
      ORDER BY ORDINAL_POSITION
    `, [tableName]);

    connection.release();
    return primaryKey;
  } catch (error) {
    console.error('[DB] Error getting table primary key:', error);
    throw error;
  }
}

/**
 * Get tables that reference this table
 */
export async function getReferencingTables(tableName: string): Promise<any> {
  try {
    const connection = await getDatabaseConnection();
    
    const [referencingTables] = await connection.execute(`
      SELECT DISTINCT
        TABLE_NAME as referencing_table,
        COLUMN_NAME as referencing_column,
        REFERENCED_COLUMN_NAME as referenced_column
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND REFERENCED_TABLE_NAME = ?
    `, [tableName]);

    connection.release();
    return referencingTables;
  } catch (error) {
    console.error('[DB] Error getting referencing tables:', error);
    throw error;
  }
}

/**
 * Get tables that this table references
 */
export async function getReferencedTables(tableName: string): Promise<any> {
  try {
    const connection = await getDatabaseConnection();
    
    const [referencedTables] = await connection.execute(`
      SELECT DISTINCT
        REFERENCED_TABLE_NAME as referenced_table,
        COLUMN_NAME as referencing_column,
        REFERENCED_COLUMN_NAME as referenced_column
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [tableName]);

    connection.release();
    return referencedTables;
  } catch (error) {
    console.error('[DB] Error getting referenced tables:', error);
    throw error;
  }
}