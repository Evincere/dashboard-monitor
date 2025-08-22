import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root1234',
  database: process.env.DB_DATABASE || 'mpd_concursos',
  timezone: '+00:00'
};

interface ReportRequest {
  type: string;
  format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
  filters?: {
    dateRange?: {
      start: string;
      end: string;
    };
    [key: string]: any;
  };
}

export async function POST(request: NextRequest) {
  let connection: mysql.Connection | null = null;

  try {
    const body: ReportRequest = await request.json();
    
    // Validar datos requeridos
    if (!body.type || !body.format) {
      return NextResponse.json({
        success: false,
        error: 'Tipo de reporte y formato son requeridos',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    connection = await mysql.createConnection(dbConfig);

    // Procesar filtros
    let processedFilters = body.filters;
    if (body.filters?.dateRange) {
      try {
        processedFilters = {
          ...body.filters,
          dateRange: {
            start: format(parseISO(body.filters.dateRange.start), 'yyyy-MM-dd', { locale: es }),
            end: format(parseISO(body.filters.dateRange.end), 'yyyy-MM-dd', { locale: es })
          }
        };
      } catch (dateError) {
        console.warn('Error processing date range:', dateError);
      }
    }

    // Mapear el tipo a los valores permitidos por la tabla
    let reportType = 'FINAL_RESULTS';
    switch (body.type.toLowerCase()) {
      case 'validacion':
      case 'validation':
        reportType = 'VALIDATION_PROGRESS';
        break;
      case 'auditoria':
      case 'audit':
        reportType = 'AUDIT_TRAIL';
        break;
      default:
        reportType = 'FINAL_RESULTS';
    }

    // Generar ID único
    const reportId = uuidv4();

    // Insertar registro de reporte en la base de datos (usando la estructura existente)
    await connection.execute(`
      INSERT INTO generated_reports (
        id,
        reportType, 
        format, 
        status, 
        generatedBy, 
        parameters,
        generatedAt
      ) VALUES (?, ?, ?, 'GENERATING', 'admin', ?, NOW())
    `, [
      reportId,
      reportType,
      body.format.toUpperCase(),
      JSON.stringify(processedFilters || {})
    ]);

    // Simular generación del reporte (en un caso real aquí iría la lógica de generación)
    // Por ahora marcamos como completado inmediatamente
    setTimeout(async () => {
      try {
        const tempConnection = await mysql.createConnection(dbConfig);
        await tempConnection.execute(`
          UPDATE generated_reports 
          SET status = 'COMPLETED', fileSize = ?
          WHERE id = ?
        `, [
          Math.floor(Math.random() * 1000000) + 50000, // Tamaño simulado
          reportId
        ]);
        await tempConnection.end();
      } catch (updateError) {
        console.error('Error updating report status:', updateError);
      }
    }, 2000); // Simular 2 segundos de procesamiento

    return NextResponse.json({
      success: true,
      data: {
        id: reportId,
        status: 'GENERATING',
        message: 'Reporte en proceso de generación'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating report:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al generar el reporte',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });

  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
