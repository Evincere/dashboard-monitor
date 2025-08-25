// ================================================
// API LISTA DE REPORTES - HISTORIAL CON FILTROS
// ================================================

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root1234',
  database: process.env.DB_DATABASE || 'mpd_concursos',
  timezone: '+00:00'
};

interface ReportFilters {
  type?: string;
  format?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export async function GET(request: NextRequest) {
  let connection: mysql.Connection | null = null;
  
  try {
    console.log('📋 [Reports List API] Fetching reports list...');
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: ReportFilters = {
      type: searchParams.get('type') || undefined,
      format: searchParams.get('format') || undefined,
      status: searchParams.get('status') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    
    // Build WHERE clause based on filters
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    
    if (filters.type) {
      whereConditions.push('reportType LIKE ?');
      queryParams.push(`%${filters.type}%`);
    }
    
    if (filters.format) {
      whereConditions.push('format = ?');
      queryParams.push(filters.format);
    }
    
    if (filters.status) {
      whereConditions.push('status = ?');
      queryParams.push(filters.status);
    }
    
    if (filters.dateFrom) {
      whereConditions.push('createdAt >= ?');
      queryParams.push(filters.dateFrom);
    }
    
    if (filters.dateTo) {
      whereConditions.push('createdAt <= ?');
      queryParams.push(filters.dateTo + ' 23:59:59');
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM generated_reports 
      ${whereClause}
    `;
    
    const [countResult] = await connection.execute(countQuery, queryParams);
    const total = (countResult as any)[0]?.total || 0;
    
    // Get reports with pagination
    const reportsQuery = `
      SELECT 
        id,
        reportType,
        format,
        fileName,
        status,
        fileSize,
        downloadCount,
        createdAt as generatedAt,
        'dashboard-user' as generatedBy,
        filePath,
        metadata
      FROM generated_reports 
      ${whereClause}
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `;
    
    const [reportsResult] = await connection.execute(
      reportsQuery, 
      [...queryParams, filters.limit, filters.offset]
    );
    
    const reports = (reportsResult as any[]).map(report => ({
      id: report.id,
      reportType: report.reportType,
      format: report.format,
      fileName: report.fileName,
      status: report.status,
      fileSize: report.fileSize,
      downloadCount: report.downloadCount || 0,
      generatedAt: report.generatedAt,
      generatedBy: report.generatedBy,
      estimatedSize: report.fileSize,
      metadata: report.metadata ? JSON.parse(report.metadata) : null
    }));
    
    console.log(`✅ [Reports List API] Found ${reports.length} reports (${total} total)`);
    
    return NextResponse.json({
      success: true,
      reports,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: (filters.offset || 0) + reports.length < total
      },
      filters: filters
    });
    
  } catch (error) {
    console.error('❌ [Reports List API] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener la lista de reportes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// ================================================
// POST - OPERACIONES BATCH EN REPORTES (OPCIONAL)
// ================================================

export async function POST(request: NextRequest) {
  let connection: mysql.Connection | null = null;
  
  try {
    const { action, reportIds } = await request.json();
    
    if (!action || !reportIds || !Array.isArray(reportIds)) {
      return NextResponse.json(
        { success: false, error: 'Acción y IDs de reportes requeridos' },
        { status: 400 }
      );
    }
    
    connection = await mysql.createConnection(dbConfig);
    
    switch (action) {
      case 'delete':
        // Delete multiple reports
        const placeholders = reportIds.map(() => '?').join(',');
        await connection.execute(
          `DELETE FROM generated_reports WHERE id IN (${placeholders})`,
          reportIds
        );
        
        return NextResponse.json({
          success: true,
          message: `${reportIds.length} reportes eliminados`,
          deletedIds: reportIds
        });
        
      case 'incrementDownload':
        // Increment download count for specific report
        const reportId = reportIds[0]; // Single report for this action
        await connection.execute(
          'UPDATE generated_reports SET downloadCount = downloadCount + 1 WHERE id = ?',
          [reportId]
        );
        
        return NextResponse.json({
          success: true,
          message: 'Contador de descarga actualizado'
        });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Acción no soportada' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('❌ [Reports List API] Batch operation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Error en operación batch',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
