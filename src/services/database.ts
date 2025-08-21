// src/services/database.ts

/**
 * @fileOverview Simplified database connection service
 */

import mysql from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/**
 * Details of a database column
 */
export interface ColumnDetails {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimary: boolean;
  isUnique: boolean;
  comment?: string;
}

/**
 * Details of a table index
 */
export interface IndexDetails {
  name: string;
  table: string;
  columns: string[];
  isUnique: boolean;
  type: 'BTREE' | 'HASH' | 'FULLTEXT' | 'SPATIAL';
}

/**
 * Details of a foreign key constraint
 */
export interface ForeignKey {
  name: string;
  fromTable: string;
  fromColumns: string[];
  toTable: string;
  toColumns: string[];
  onDelete?: string;
  onUpdate?: string;
}

/**
 * Details of a database table
 */
export interface TableDetails {
  name: string;
  columns: ColumnDetails[];
  primaryKey?: string[];
  engine?: string;
  comment?: string;
  // Size information
  dataLength?: number | null;
  indexLength?: number | null;
  avgRowLength?: number | null;
  rowCount?: number | null;
}

/**
 * Complete schema details
 */
export interface SchemaDetails {
  tables: TableDetails[];
  foreignKeys: ForeignKey[];
  indexes: IndexDetails[];
}

let pool: mysql.Pool | null = null;

/**
 * Get database connection pool with minimal, valid configuration
 */
function getConnectionPool(): mysql.Pool {
  if (!pool) {
    const poolConfig = {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3307'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root1234',
      database: process.env.DB_DATABASE || 'mpd_concursos',

      // Only use valid MySQL2 options
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,

      // Basic settings
      multipleStatements: false,
      dateStrings: false,
      supportBigNumbers: true,
      bigNumberStrings: false,
      charset: 'utf8mb4'
    };

    console.log('[DB] Creating pool with config:', {
      host: poolConfig.host,
      port: poolConfig.port,
      database: poolConfig.database
    });

    pool = mysql.createPool(poolConfig);

    // Error handling through process events since Pool doesn't expose error event
    process.on('uncaughtException', (err) => {
      if (err.message.includes('mysql')) {
        console.error('[DB] Pool error:', err);
      }
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
 * Execute query with automatic connection management
 */
export async function executeQuery(query: string, params?: any[]): Promise<any> {
  const connectionPool = getConnectionPool();
  const connection = await connectionPool.getConnection();

  try {
    const result = await connection.execute(query, params);
    return result;
  } catch (err) {
    console.error('[DB] Query failed:', err);
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Test database connection
 */
interface TestQueryResult extends RowDataPacket {
  test: number;
  current_time: Date;
  database_name: string;
}

export async function testDatabaseConnection(): Promise<{
  connection: string;
  test_query: TestQueryResult;
}> {
  try {
    const connectionPool = getConnectionPool();
    const connection = await connectionPool.getConnection();

    // The result will be a tuple of [rows, fields]
    const [rows] = await connection.execute<(TestQueryResult & RowDataPacket)[]>('SELECT 1 as test, NOW() as current_time, DATABASE() as database_name');

    connection.release();

    return {
      connection: 'successful',
      test_query: rows[0]
    };
  } catch (error) {
    console.error('[DB] Database connection test failed:', error);
    throw error;
  }
}

// Placeholder functions to satisfy imports (will return mock data for now)
export async function getDbSchema(): Promise<any> {
  return { tables: [], views: [], message: 'Schema introspection temporarily disabled' };
}

export async function getSchemaOverview(): Promise<any> {
  return { tablesCount: 60, message: 'Schema overview temporarily using mock data' };
}

export async function getDatabaseMetadata(): Promise<any> {
  return { version: '8.0.43', message: 'Database metadata temporarily using mock data' };
}

export async function validateSchemaIntegrity(): Promise<any> {
  return { isValid: true, issues: [], message: 'Schema validation temporarily disabled' };
}

export async function analyzeTableStorage(): Promise<any> {
  return [{ TABLE_NAME: 'user_entity', total_size_mb: 5 }];
}

export async function getTableConstraints(): Promise<any> {
  return [];
}

export async function getTablePrivileges(): Promise<any> {
  return [];
}

export async function getTableTriggers(): Promise<any> {
  return [];
}

export async function getTableSchema(): Promise<any> {
  return [];
}

export async function getTableForeignKeys(): Promise<any> {
  return [];
}

export async function getTableIndexes(): Promise<any> {
  return [];
}

export async function getTablePrimaryKey(): Promise<any> {
  return [];
}

export async function getReferencingTables(): Promise<any> {
  return [];
}

export async function getReferencedTables(): Promise<any> {
  return [];
}

export function getPoolStats(): any {
  return { totalConnections: 0, activeConnections: 0 };
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
