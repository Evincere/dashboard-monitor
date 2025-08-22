import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(dbConfig);

    // Obtener todos los reportes generados (usando la estructura existente de la tabla)
    const [reports] = await connection.execute(`
      SELECT 
        id,
        reportType,
        format,
        status,
        generatedBy,
        fileSize,
        generatedAt,
        downloadCount,
        parameters
      FROM generated_reports 
      ORDER BY generatedAt DESC
      LIMIT 50
    `);

    return NextResponse.json({
      success: true,
      data: reports,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch reports',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });

  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
