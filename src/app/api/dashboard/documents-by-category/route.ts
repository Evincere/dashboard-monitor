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

interface DocumentCategory {
  name: string;
  count: number;
  percentage: number;
}

async function getDocumentsByCategory(): Promise<DocumentCategory[]> {
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(dbConfig);

    // Get documents count by document type
    const [documentsResult] = await connection.execute(`
      SELECT 
        dt.name,
        COUNT(d.id) as count
      FROM document_types dt
      LEFT JOIN documents d ON dt.id = d.document_type_id
      WHERE dt.is_active = 1
      GROUP BY dt.id, dt.name
      ORDER BY count DESC, dt.name ASC
    `);

    const documents = documentsResult as any[];
    const totalDocs = documents.reduce((sum, doc) => sum + doc.count, 0);

    // Calculate percentages and format response
    const categoriesWithPercentage: DocumentCategory[] = documents.map(doc => ({
      name: doc.name,
      count: doc.count,
      percentage: totalDocs > 0 ? Number(((doc.count / totalDocs) * 100).toFixed(1)) : 0
    }));

    return categoriesWithPercentage;

  } catch (error) {
    console.error('Error fetching documents by category:', error);
    return [];
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const documentsByCategory = await getDocumentsByCategory();

    return NextResponse.json({
      success: true,
      data: documentsByCategory,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Documents by category API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch documents by category',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
