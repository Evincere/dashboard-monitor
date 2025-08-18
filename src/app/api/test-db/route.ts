import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  try {
    console.log('[TEST-DB] Config:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_DATABASE
    });
    
    // Simple connection test using env vars
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3307'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root1234',
      database: process.env.DB_DATABASE || 'mpd_concursos',
      connectTimeout: 30000
    });

    console.log('[TEST-DB] Connection created, testing query...');
    
    const [result] = await connection.execute('SELECT COUNT(*) as user_count FROM user_entity');
    
    await connection.end();
    
    console.log('[TEST-DB] Query successful:', result);

    return NextResponse.json({
      success: true,
      message: 'Conexión exitosa',
      result: result[0],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[TEST-DB] Connection failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error al conectar con la base de datos',
      error: error.message || error.code || 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
