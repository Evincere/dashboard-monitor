// src/services/database.ts
'use server';

import mysql from 'mysql2/promise';
import { z } from 'zod';

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Enhanced schema definition with complete database structure
const ColumnDetailsSchema = z.object({
  name: z.string(),
  type: z.string(),
  isNullable: z.boolean(),
  defaultValue: z.string().nullable(),
  maxLength: z.number().nullable(),
  numericPrecision: z.number().nullable(),
  numericScale: z.number().nullable(),
  characterSet: z.string().nullable(),
  collation: z.string().nullable(),
  comment: z.string().nullable(),
  isAutoIncrement: z.boolean(),
  ordinalPosition: z.number(),
});

const TableDetailsSchema = z.object({
  name: z.string(),
  engine: z.string().nullable(),
  rowFormat: z.string().nullable(),
  tableRows: z.number().nullable(),
  avgRowLength: z.number().nullable(),
  dataLength: z.number().nullable(),
  indexLength: z.number().nullable(),
  autoIncrement: z.number().nullable(),
  createTime: z.date().nullable(),
  updateTime: z.date().nullable(),
  tableCollation: z.string().nullable(),
  comment: z.string().nullable(),
  columns: z.array(ColumnDetailsSchema),
});

const ForeignKeySchema = z.object({
  constraintName: z.string(),
  fromTable: z.string(),
  fromColumn: z.string(),
  toTable: z.string(),
  toColumn: z.string(),
  updateRule: z.string(),
  deleteRule: z.string(),
});

const IndexDetailsSchema = z.object({
  tableName: z.string(),
  indexName: z.string(),
  columns: z.array(z.string()),
  isPrimary: z.boolean(),
  isUnique: z.boolean(),
  indexType: z.string(),
  comment: z.string().nullable(),
});

const ViewDetailsSchema = z.object({
  name: z.string(),
  definition: z.string(),
  checkOption: z.string().nullable(),
  isUpdatable: z.boolean(),
  definer: z.string(),
  securityType: z.string(),
});

const RoutineDetailsSchema = z.object({
  name: z.string(),
  type: z.enum(['FUNCTION', 'PROCEDURE']),
  dataType: z.string().nullable(),
  definition: z.string(),
  isDeterministic: z.boolean(),
  sqlDataAccess: z.string(),
  securityType: z.string(),
  definer: z.string(),
  comment: z.string().nullable(),
  created: z.date(),
  modified: z.date(),
});

const SchemaDetailsSchema = z.object({
  tables: z.array(TableDetailsSchema),
  views: z.array(ViewDetailsSchema),
  routines: z.array(RoutineDetailsSchema),
  foreignKeys: z.array(ForeignKeySchema),
  indexes: z.array(IndexDetailsSchema),
  schemaName: z.string(),
  characterSet: z.string(),
  collation: z.string(),
  lastIntrospection: z.date(),
});

export type SchemaDetails = z.infer<typeof SchemaDetailsSchema>;
export type TableDetails = z.infer<typeof TableDetailsSchema>;
export type ColumnDetails = z.infer<typeof ColumnDetailsSchema>;
export type ForeignKey = z.infer<typeof ForeignKeySchema>;
export type IndexDetails = z.infer<typeof IndexDetailsSchema>;
export type ViewDetails = z.infer<typeof ViewDetailsSchema>;
export type RoutineDetails = z.infer<typeof RoutineDetailsSchema>;

// Enhanced cache configuration with multiple cache levels
let cachedSchema: SchemaDetails | null = null;
let cacheTimestamp = 0;
const DEFAULT_CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Table-specific cache for faster individual table lookups
const tableCache = new Map<string, { data: TableDetails; timestamp: number }>();
const TABLE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for individual tables

// Configurable cache duration from environment or default
const getCacheDuration = (): number => {
  const envDuration = process.env.SCHEMA_CACHE_DURATION_MINUTES;
  if (envDuration && !isNaN(parseInt(envDuration))) {
    return parseInt(envDuration) * 60 * 1000;
  }
  return DEFAULT_CACHE_DURATION;
};

// Enhanced cache statistics
interface CacheStatistics {
  totalHits: number;
  totalMisses: number;
  lastClearTime: Date | null;
  cacheSize: number;
}

let cacheStats: CacheStatistics = {
  totalHits: 0,
  totalMisses: 0,
  lastClearTime: null,
  cacheSize: 0,
};

// Connection pool for better performance
let connectionPool: mysql.Pool | null = null;

function getConnectionPool(): mysql.Pool {
  if (!connectionPool) {
    connectionPool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return connectionPool;
}

async function getConnection() {
  return getConnectionPool().getConnection();
}

/**
 * Gets the complete database schema with comprehensive introspection.
 * Uses INFORMATION_SCHEMA to map the complete structure including tables, views, 
 * routines, foreign keys, and indexes with optimized caching.
 */
export async function getDbSchema(forceRefresh = false): Promise<SchemaDetails> {
  const now = Date.now();
  const cacheDuration = getCacheDuration();
  
  if (!forceRefresh && cachedSchema && (now - cacheTimestamp < cacheDuration)) {
    cacheStats.totalHits++;
    return cachedSchema;
  }
  
  cacheStats.totalMisses++;

  const connection = await getConnection();
  try {
    const dbName = dbConfig.database;
    if (!dbName) {
      throw new Error('Database name not configured');
    }

    // Get database metadata
    const [dbInfoResult] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT default_character_set_name, default_collation_name
      FROM information_schema.schemata
      WHERE schema_name = ?
    `, [dbName]);
    
    const dbInfo = dbInfoResult[0];

    // 1. Get complete table information with metadata
    const [tablesResult] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT 
        table_name,
        engine,
        row_format,
        table_rows,
        avg_row_length,
        data_length,
        index_length,
        auto_increment,
        create_time,
        update_time,
        table_collation,
        table_comment
      FROM information_schema.tables
      WHERE table_schema = ? AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, [dbName]);

    // 2. Get complete column information for all tables
    const [columnsResult] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        character_set_name,
        collation_name,
        column_comment,
        extra,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = ?
      ORDER BY table_name, ordinal_position
    `, [dbName]);

    // Group columns by table
    const columnsByTable = columnsResult.reduce((acc, col) => {
      if (!acc[col.table_name]) {
        acc[col.table_name] = [];
      }
      acc[col.table_name].push({
        name: col.column_name,
        type: col.data_type,
        isNullable: col.is_nullable === 'YES',
        defaultValue: col.column_default,
        maxLength: col.character_maximum_length,
        numericPrecision: col.numeric_precision,
        numericScale: col.numeric_scale,
        characterSet: col.character_set_name,
        collation: col.collation_name,
        comment: col.column_comment,
        isAutoIncrement: col.extra?.includes('auto_increment') || false,
        ordinalPosition: col.ordinal_position,
      });
      return acc;
    }, {} as Record<string, ColumnDetails[]>);

    // Build complete table details
    const tables: TableDetails[] = tablesResult.map(table => ({
      name: table.table_name,
      engine: table.engine,
      rowFormat: table.row_format,
      tableRows: table.table_rows,
      avgRowLength: table.avg_row_length,
      dataLength: table.data_length,
      indexLength: table.index_length,
      autoIncrement: table.auto_increment,
      createTime: table.create_time,
      updateTime: table.update_time,
      tableCollation: table.table_collation,
      comment: table.table_comment,
      columns: columnsByTable[table.table_name] || [],
    }));

    // 3. Get complete foreign key relationships with rules
    const [foreignKeysResult] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT
        rc.constraint_name,
        kcu.table_name AS from_table,
        kcu.column_name AS from_column,
        kcu.referenced_table_name AS to_table,
        kcu.referenced_column_name AS to_column,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.referential_constraints rc
      JOIN information_schema.key_column_usage kcu 
        ON rc.constraint_name = kcu.constraint_name 
        AND rc.constraint_schema = kcu.constraint_schema
      WHERE rc.constraint_schema = ?
      ORDER BY rc.constraint_name
    `, [dbName]);

    const foreignKeys: ForeignKey[] = foreignKeysResult.map(fk => ({
      constraintName: fk.constraint_name,
      fromTable: fk.from_table,
      fromColumn: fk.from_column,
      toTable: fk.to_table,
      toColumn: fk.to_column,
      updateRule: fk.update_rule,
      deleteRule: fk.delete_rule,
    }));

    // 4. Get complete index information
    const [indexesResult] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT
        table_name,
        index_name,
        column_name,
        non_unique,
        seq_in_index,
        index_type,
        index_comment,
        index_name = 'PRIMARY' AS is_primary
      FROM information_schema.statistics
      WHERE table_schema = ?
      ORDER BY table_name, index_name, seq_in_index
    `, [dbName]);

    const indexesMap = indexesResult.reduce((acc, row) => {
      const key = `${row.table_name}.${row.index_name}`;
      if (!acc[key]) {
        acc[key] = {
          tableName: row.table_name,
          indexName: row.index_name,
          columns: [],
          isPrimary: row.is_primary === 1,
          isUnique: row.non_unique === 0,
          indexType: row.index_type,
          comment: row.index_comment,
        };
      }
      acc[key].columns.push(row.column_name);
      return acc;
    }, {} as Record<string, IndexDetails>);
    const indexes = Object.values(indexesMap);

    // 5. Get views
    const [viewsResult] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT
        table_name,
        view_definition,
        check_option,
        is_updatable,
        definer,
        security_type
      FROM information_schema.views
      WHERE table_schema = ?
      ORDER BY table_name
    `, [dbName]);

    const views: ViewDetails[] = viewsResult.map(view => ({
      name: view.table_name,
      definition: view.view_definition,
      checkOption: view.check_option,
      isUpdatable: view.is_updatable === 'YES',
      definer: view.definer,
      securityType: view.security_type,
    }));

    // 6. Get stored procedures and functions
    const [routinesResult] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT
        routine_name,
        routine_type,
        data_type,
        routine_definition,
        is_deterministic,
        sql_data_access,
        security_type,
        definer,
        routine_comment,
        created,
        last_altered
      FROM information_schema.routines
      WHERE routine_schema = ?
      ORDER BY routine_name
    `, [dbName]);

    const routines: RoutineDetails[] = routinesResult.map(routine => ({
      name: routine.routine_name,
      type: routine.routine_type as 'FUNCTION' | 'PROCEDURE',
      dataType: routine.data_type,
      definition: routine.routine_definition,
      isDeterministic: routine.is_deterministic === 'YES',
      sqlDataAccess: routine.sql_data_access,
      securityType: routine.security_type,
      definer: routine.definer,
      comment: routine.routine_comment,
      created: routine.created,
      modified: routine.last_altered,
    }));

    // Build complete schema
    const schema: SchemaDetails = {
      tables,
      views,
      routines,
      foreignKeys,
      indexes,
      schemaName: dbName,
      characterSet: dbInfo?.default_character_set_name || 'utf8mb4',
      collation: dbInfo?.default_collation_name || 'utf8mb4_unicode_ci',
      lastIntrospection: new Date(),
    };
    
    // Update cache
    cachedSchema = schema;
    cacheTimestamp = now;
    cacheStats.cacheSize = JSON.stringify(schema).length;

    return schema;
  } finally {
    connection.release();
  }
}

/**
 * Gets schema information for a specific table including all its details.
 * Uses optimized table-level caching for better performance.
 */
export async function getTableSchema(tableName: string): Promise<TableDetails | null> {
  const now = Date.now();
  
  // Check table-specific cache first
  const cachedTable = tableCache.get(tableName);
  if (cachedTable && (now - cachedTable.timestamp < TABLE_CACHE_DURATION)) {
    cacheStats.totalHits++;
    return cachedTable.data;
  }
  
  const schema = await getDbSchema();
  const table = schema.tables.find(table => table.name === tableName) || null;
  
  // Cache the individual table if found
  if (table) {
    tableCache.set(tableName, { data: table, timestamp: now });
  }
  
  return table;
}

/**
 * Gets all foreign key relationships for a specific table.
 */
export async function getTableForeignKeys(tableName: string): Promise<ForeignKey[]> {
  const schema = await getDbSchema();
  return schema.foreignKeys.filter(fk => 
    fk.fromTable === tableName || fk.toTable === tableName
  );
}

/**
 * Gets all indexes for a specific table.
 */
export async function getTableIndexes(tableName: string): Promise<IndexDetails[]> {
  const schema = await getDbSchema();
  return schema.indexes.filter(index => index.tableName === tableName);
}

/**
 * Gets the primary key columns for a specific table.
 */
export async function getTablePrimaryKey(tableName: string): Promise<string[]> {
  const indexes = await getTableIndexes(tableName);
  const primaryIndex = indexes.find(index => index.isPrimary);
  return primaryIndex?.columns || [];
}

/**
 * Gets all tables that reference the specified table via foreign keys.
 */
export async function getReferencingTables(tableName: string): Promise<string[]> {
  const schema = await getDbSchema();
  const referencingTables = schema.foreignKeys
    .filter(fk => fk.toTable === tableName)
    .map(fk => fk.fromTable);
  return [...new Set(referencingTables)];
}

/**
 * Gets all tables that the specified table references via foreign keys.
 */
export async function getReferencedTables(tableName: string): Promise<string[]> {
  const schema = await getDbSchema();
  const referencedTables = schema.foreignKeys
    .filter(fk => fk.fromTable === tableName)
    .map(fk => fk.toTable);
  return [...new Set(referencedTables)];
}

// Cache management functions moved to src/lib/database-utils.ts
// to avoid Next.js Server Actions interpretation

/**
 * Gets a summary of the database schema for quick overview.
 */
export async function getSchemaOverview(): Promise<{
  tablesCount: number;
  viewsCount: number;
  routinesCount: number;
  foreignKeysCount: number;
  indexesCount: number;
  totalColumns: number;
  schemaName: string;
  characterSet: string;
  collation: string;
  lastIntrospection: Date;
}> {
  const schema = await getDbSchema();
  
  return {
    tablesCount: schema.tables.length,
    viewsCount: schema.views.length,
    routinesCount: schema.routines.length,
    foreignKeysCount: schema.foreignKeys.length,
    indexesCount: schema.indexes.length,
    totalColumns: schema.tables.reduce((sum, table) => sum + table.columns.length, 0),
    schemaName: schema.schemaName,
    characterSet: schema.characterSet,
    collation: schema.collation,
    lastIntrospection: schema.lastIntrospection,
  };
}

/**
 * Executes a SQL query against the database with connection pooling.
 * @param sql The SQL query to execute.
 * @param params The parameters for the query.
 * @returns The result of the query.
 */
export async function executeQuery<T>(sql: string, params: any[] = []): Promise<T> {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(sql, params);
    return rows as T;
  } finally {
    connection.release();
  }
}

/**
 * Gets detailed constraint information for all tables including check constraints.
 */
export async function getTableConstraints(tableName?: string): Promise<Array<{
  constraintName: string;
  tableName: string;
  constraintType: string;
  columnName: string | null;
  referencedTable: string | null;
  referencedColumn: string | null;
  checkClause: string | null;
}>> {
  const connection = await getConnection();
  try {
    const dbName = dbConfig.database;
    let query = `
      SELECT
        tc.constraint_name,
        tc.table_name,
        tc.constraint_type,
        kcu.column_name,
        kcu.referenced_table_name,
        kcu.referenced_column_name,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
        AND tc.table_schema = cc.constraint_schema
      WHERE tc.table_schema = ?
    `;
    
    const params = [dbName];
    if (tableName) {
      query += ' AND tc.table_name = ?';
      params.push(tableName);
    }
    
    query += ' ORDER BY tc.table_name, tc.constraint_name';
    
    const [result] = await connection.execute<mysql.RowDataPacket[]>(query, params);
    
    return result.map(row => ({
      constraintName: row.constraint_name,
      tableName: row.table_name,
      constraintType: row.constraint_type,
      columnName: row.column_name,
      referencedTable: row.referenced_table_name,
      referencedColumn: row.referenced_column_name,
      checkClause: row.check_clause,
    }));
  } finally {
    connection.release();
  }
}

/**
 * Gets table privileges and permissions for the current user.
 */
export async function getTablePrivileges(tableName?: string): Promise<Array<{
  tableName: string;
  privilegeType: string;
  isGrantable: boolean;
  grantor: string;
  grantee: string;
}>> {
  const connection = await getConnection();
  try {
    const dbName = dbConfig.database;
    let query = `
      SELECT
        table_name,
        privilege_type,
        is_grantable,
        grantor,
        grantee
      FROM information_schema.table_privileges
      WHERE table_schema = ?
    `;
    
    const params = [dbName];
    if (tableName) {
      query += ' AND table_name = ?';
      params.push(tableName);
    }
    
    query += ' ORDER BY table_name, privilege_type';
    
    const [result] = await connection.execute<mysql.RowDataPacket[]>(query, params);
    
    return result.map(row => ({
      tableName: row.table_name,
      privilegeType: row.privilege_type,
      isGrantable: row.is_grantable === 'YES',
      grantor: row.grantor,
      grantee: row.grantee,
    }));
  } finally {
    connection.release();
  }
}

/**
 * Gets detailed trigger information for tables.
 */
export async function getTableTriggers(tableName?: string): Promise<Array<{
  triggerName: string;
  tableName: string;
  eventManipulation: string;
  actionTiming: string;
  actionStatement: string;
  created: Date;
  definer: string;
}>> {
  const connection = await getConnection();
  try {
    const dbName = dbConfig.database;
    let query = `
      SELECT
        trigger_name,
        event_object_table,
        event_manipulation,
        action_timing,
        action_statement,
        created,
        definer
      FROM information_schema.triggers
      WHERE trigger_schema = ?
    `;
    
    const params = [dbName];
    if (tableName) {
      query += ' AND event_object_table = ?';
      params.push(tableName);
    }
    
    query += ' ORDER BY event_object_table, trigger_name';
    
    const [result] = await connection.execute<mysql.RowDataPacket[]>(query, params);
    
    return result.map(row => ({
      triggerName: row.trigger_name,
      tableName: row.event_object_table,
      eventManipulation: row.event_manipulation,
      actionTiming: row.action_timing,
      actionStatement: row.action_statement,
      created: row.created,
      definer: row.definer,
    }));
  } finally {
    connection.release();
  }
}

/**
 * Analyzes table storage and provides optimization recommendations.
 */
export async function analyzeTableStorage(): Promise<Array<{
  tableName: string;
  engine: string;
  rows: number;
  dataSize: number;
  indexSize: number;
  totalSize: number;
  avgRowSize: number;
  fragmentation: number;
  recommendations: string[];
}>> {
  const connection = await getConnection();
  try {
    const dbName = dbConfig.database;
    const [result] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT
        table_name,
        engine,
        table_rows,
        data_length,
        index_length,
        data_free,
        avg_row_length
      FROM information_schema.tables
      WHERE table_schema = ? AND table_type = 'BASE TABLE'
      ORDER BY (data_length + index_length) DESC
    `, [dbName]);
    
    return result.map(row => {
      const dataSize = row.data_length || 0;
      const indexSize = row.index_length || 0;
      const totalSize = dataSize + indexSize;
      const fragmentation = row.data_free ? (row.data_free / totalSize) * 100 : 0;
      
      const recommendations: string[] = [];
      
      // Fragmentation recommendations
      if (fragmentation > 10) {
        recommendations.push(`High fragmentation (${fragmentation.toFixed(1)}%) - consider OPTIMIZE TABLE`);
      }
      
      // Index size recommendations
      if (indexSize > dataSize * 0.5) {
        recommendations.push('Index size is large relative to data - review index usage');
      }
      
      // Row size recommendations
      if (row.avg_row_length > 8192) {
        recommendations.push('Large average row size - consider normalizing or using TEXT/BLOB columns');
      }
      
      return {
        tableName: row.table_name,
        engine: row.engine,
        rows: row.table_rows || 0,
        dataSize,
        indexSize,
        totalSize,
        avgRowSize: row.avg_row_length || 0,
        fragmentation,
        recommendations,
      };
    });
  } finally {
    connection.release();
  }
}

/**
 * Gets comprehensive database metadata including version, settings, and status.
 */
export async function getDatabaseMetadata(): Promise<{
  version: string;
  versionComment: string;
  characterSet: string;
  collation: string;
  timezone: string;
  maxConnections: number;
  currentConnections: number;
  uptime: number;
  dataDirectory: string;
}> {
  const connection = await getConnection();
  try {
    const [versionResult] = await connection.execute<mysql.RowDataPacket[]>('SELECT VERSION() as version, @@version_comment as version_comment');
    const [settingsResult] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT 
        @@character_set_database as character_set,
        @@collation_database as collation,
        @@time_zone as timezone,
        @@max_connections as max_connections,
        @@datadir as data_directory
    `);
    const [statusResult] = await connection.execute<mysql.RowDataPacket[]>(`
      SHOW STATUS WHERE Variable_name IN ('Threads_connected', 'Uptime')
    `);
    
    const statusMap = statusResult.reduce((acc, row) => {
      acc[row.Variable_name] = row.Value;
      return acc;
    }, {} as Record<string, any>);
    
    return {
      version: versionResult[0].version,
      versionComment: versionResult[0].version_comment,
      characterSet: settingsResult[0].character_set,
      collation: settingsResult[0].collation,
      timezone: settingsResult[0].timezone,
      maxConnections: parseInt(settingsResult[0].max_connections),
      currentConnections: parseInt(statusMap.Threads_connected || '0'),
      uptime: parseInt(statusMap.Uptime || '0'),
      dataDirectory: settingsResult[0].data_directory,
    };
  } finally {
    connection.release();
  }
}

/**
 * Validates schema integrity and identifies potential issues.
 */
export async function validateSchemaIntegrity(): Promise<{
  isValid: boolean;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    table: string;
    column?: string;
    message: string;
    recommendation?: string;
  }>;
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    infos: number;
  };
}> {
  const schema = await getDbSchema();
  const issues: Array<{
    type: 'error' | 'warning' | 'info';
    table: string;
    column?: string;
    message: string;
    recommendation?: string;
  }> = [];
  
  // Check for tables without primary keys
  schema.tables.forEach(table => {
    const hasPrimaryKey = schema.indexes.some(
      index => index.tableName === table.name && index.isPrimary
    );
    
    if (!hasPrimaryKey) {
      issues.push({
        type: 'warning',
        table: table.name,
        message: 'Table has no primary key',
        recommendation: 'Add a primary key for better performance and replication',
      });
    }
  });
  
  // Check for foreign keys without corresponding indexes
  schema.foreignKeys.forEach(fk => {
    const hasIndex = schema.indexes.some(
      index => index.tableName === fk.fromTable && 
               index.columns.includes(fk.fromColumn)
    );
    
    if (!hasIndex) {
      issues.push({
        type: 'warning',
        table: fk.fromTable,
        column: fk.fromColumn,
        message: 'Foreign key column lacks index',
        recommendation: `Add index on ${fk.fromTable}.${fk.fromColumn} for better performance`,
      });
    }
  });
  
  // Check for orphaned foreign key references
  schema.foreignKeys.forEach(fk => {
    const referencedTableExists = schema.tables.some(table => table.name === fk.toTable);
    if (!referencedTableExists) {
      issues.push({
        type: 'error',
        table: fk.fromTable,
        column: fk.fromColumn,
        message: `Foreign key references non-existent table: ${fk.toTable}`,
        recommendation: 'Remove the foreign key constraint or create the referenced table',
      });
    }
  });
  
  const summary = {
    totalIssues: issues.length,
    errors: issues.filter(i => i.type === 'error').length,
    warnings: issues.filter(i => i.type === 'warning').length,
    infos: issues.filter(i => i.type === 'info').length,
  };
  
  return {
    isValid: summary.errors === 0,
    issues,
    summary,
  };
}

/**
 * Closes the connection pool. Should be called when shutting down the application.
 */
export async function closeConnectionPool(): Promise<void> {
  if (connectionPool) {
    await connectionPool.end();
    connectionPool = null;
  }
}
