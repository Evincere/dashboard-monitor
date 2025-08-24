import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root1234',
  database: process.env.DB_DATABASE || 'mpd_concursos',
  timezone: '+00:00'
};

export async function createConnection(): Promise<mysql.Connection> {
  return await mysql.createConnection(dbConfig);
}

export async function executeQuery<T = any>(
  query: string,
  params: any[] = []
): Promise<T[]> {
  let connection: mysql.Connection | null = null;
  
  try {
    connection = await createConnection();
    const [rows] = await connection.execute(query, params);
    return rows as T[];
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function executeQuerySingle<T = any>(
  query: string,
  params: any[] = []
): Promise<T | null> {
  const results = await executeQuery<T>(query, params);
  return results.length > 0 ? results[0] : null;
}

export { mysql };
