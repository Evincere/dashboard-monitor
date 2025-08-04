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

const SchemaDetailsSchema = z.object({
  tables: z.array(z.object({
    name: z.string(),
    columns: z.array(z.object({
      name: z.string(),
      type: z.string(),
      isNullable: z.boolean(),
    })),
  })),
  relations: z.array(z.object({
    fromTable: z.string(),
    fromColumn: z.string(),
    toTable: z.string(),
    toColumn: z.string(),
  })),
  indexes: z.array(z.object({
    tableName: z.string(),
    indexName: z.string(),
    columns: z.array(z.string()),
    isPrimary: z.boolean(),
  }))
});

export type SchemaDetails = z.infer<typeof SchemaDetailsSchema>;

// Cache for the schema
let cachedSchema: SchemaDetails | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

async function getConnection() {
  return mysql.createConnection(dbConfig);
}

/**
 * Gets the detailed database schema, using a cache to avoid frequent queries.
 */
export async function getDbSchema(): Promise<SchemaDetails> {
  const now = Date.now();
  if (cachedSchema && (now - cacheTimestamp < CACHE_DURATION)) {
    return cachedSchema;
  }

  const connection = await getConnection();
  try {
    const dbName = dbConfig.database;

    // 1. Get all tables
    const [tablesResult] = await connection.execute<mysql.RowDataPacket[]>(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = ? AND table_type = 'BASE TABLE'
    `, [dbName]);
    const tableNames = tablesResult.map(row => row.table_name);

    // 2. Get columns for each table
    const tables = await Promise.all(tableNames.map(async (tableName) => {
        const [columnsResult] = await connection.execute<mysql.RowDataPacket[]>(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = ? AND table_name = ?
            ORDER BY ordinal_position
        `, [dbName, tableName]);
        return {
            name: tableName,
            columns: columnsResult.map(col => ({
                name: col.column_name,
                type: col.data_type,
                isNullable: col.is_nullable === 'YES',
            })),
        };
    }));
    
    // 3. Get foreign key relationships
    const [relationsResult] = await connection.execute<mysql.RowDataPacket[]>(`
        SELECT
            kcu.table_name AS fromTable,
            kcu.column_name AS fromColumn,
            kcu.referenced_table_name AS toTable,
            kcu.referenced_column_name AS toColumn
        FROM information_schema.key_column_usage kcu
        JOIN information_schema.referential_constraints rc 
            ON kcu.constraint_name = rc.constraint_name AND kcu.table_schema = rc.constraint_schema
        WHERE kcu.table_schema = ? AND kcu.referenced_table_name IS NOT NULL
    `, [dbName]);
    const relations = relationsResult.map(row => ({
        fromTable: row.fromTable,
        fromColumn: row.fromColumn,
        toTable: row.toTable,
        toColumn: row.toColumn,
    }));

    // 4. Get indexes and primary keys
    const [indexesResult] = await connection.execute<mysql.RowDataPacket[]>(`
        SELECT
            table_name,
            index_name,
            column_name,
            non_unique,
            seq_in_index,
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
            };
        }
        acc[key].columns.push(row.column_name);
        return acc;
    }, {} as Record<string, any>);
    const indexes = Object.values(indexesMap);

    const schema: SchemaDetails = { tables, relations, indexes };
    
    cachedSchema = schema;
    cacheTimestamp = now;

    return schema;
  } finally {
    await connection.end();
  }
}

/**
 * Executes a SQL query against the database.
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
    await connection.end();
  }
}
