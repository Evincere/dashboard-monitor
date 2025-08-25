// ================================================
// API GENERACIÓN DE REPORTES MEJORADA - TIPOS EXPANDIDOS
// ================================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
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

// =====================================
// INTERFACES EXPANDIDAS
// =====================================

interface ReportRequest {
  type: 'validation-progress' | 'final-results' | 'audit-report' | 
        'executive-summary' | 'performance-dashboard' | 'user-activity' | 
        'document-status' | 'audit-trail' | 'compliance-report' | 
        'security-report' | 'system-performance' | 'processing-times';
  format: 'PDF' | 'EXCEL' | 'JSON';
  filters?: {
    dateRange?: {
      start: string;
      end: string;
    };
    userIds?: string[];
    status?: string[];
    category?: string;
  };
  options?: {
    includeCharts?: boolean;
    detailLevel?: 'summary' | 'detailed' | 'complete';
  };
}

interface ReportResponse {
  success: boolean;
  reportId: string;
  downloadUrl: string;
  fileName: string;
  generatedAt: string;
  estimatedSize?: string;
  error?: string;
}

// Mapping de tipos legacy a nuevos tipos
const LEGACY_TYPE_MAPPING = {
  'validation-progress': 'validation-progress',
  'final-results': 'executive-summary', 
  'audit-report': 'audit-trail'
};

// =====================================
// POST - GENERAR REPORTE CON TIPOS EXPANDIDOS
// =====================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let connection: mysql.Connection | null = null;
  
  try {
    console.log('📊 [Reports API Enhanced] Starting report generation...');
    
    // Parsear request body
    const body: ReportRequest = await request.json();
    
    // Validar datos de entrada
    const validation = validateReportRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Datos inválidos: ${validation.errors.join(', ')}` 
        },
        { status: 400 }
      );
    }
    
    // Generar ID único del reporte
    const reportId = uuidv4();
    const timestamp = new Date().toISOString();
    
    console.log(`📋 [Reports API Enhanced] Generating report - Type: ${body.type}, Format: ${body.format}, ID: ${reportId}`);
    
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    
    // Simular procesamiento más realista basado en tipo de reporte
    const processingTime = getProcessingTime(body.type);
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Generar datos mock específicos por tipo de reporte
    const mockData = generateEnhancedMockData(body.type, body.filters);
    
    if (mockData.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No hay datos disponibles para los filtros especificados' 
        },
        { status: 404 }
      );
    }
    
    // Preparar datos del reporte
    const fileName = generateEnhancedFileName(body.type, body.format, timestamp);
    const downloadUrl = `/api/reports/${reportId}/download`;
    const estimatedSize = estimateEnhancedFileSize(mockData.length, body.format, body.type);
    
    // Guardar el reporte en la base de datos
    try {
      await connection.execute(`
        INSERT INTO generated_reports 
        (id, reportType, format, fileName, status, fileSize, filePath, metadata, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?, ?, ?, NOW(), NOW())
      `, [
        reportId,
        body.type,
        body.format,
        fileName,
        estimatedSize,
        `/tmp/reports/${reportId}`,
        JSON.stringify({
          filters: body.filters,
          options: body.options,
          recordCount: mockData.length,
          generatedAt: timestamp,
          category: getReportCategory(body.type),
          complexity: getReportComplexity(body.type),
          dataSource: getReportDataSources(body.type)
        })
      ]);
      
      console.log(`✅ [Reports API Enhanced] Report saved to database - ID: ${reportId}`);
      
    } catch (dbError) {
      console.error('❌ [Reports API Enhanced] Database error:', dbError);
    }
    
    // Preparar respuesta exitosa
    const response: ReportResponse = {
      success: true,
      reportId,
      downloadUrl,
      fileName,
      generatedAt: timestamp,
      estimatedSize
    };

    const executionTime = Date.now() - startTime;
    console.log(`✅ [Reports API Enhanced] Report generated successfully - ID: ${reportId}, Time: ${executionTime}ms`);
    
    return NextResponse.json(response, {
      headers: {
        'X-Generation-Time': `${executionTime}ms`,
        'X-Report-ID': reportId,
        'X-Report-Type': body.type,
        'X-Enhanced-API': 'true'
      }
    });
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ [Reports API Enhanced] General error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'X-Generation-Time': `${executionTime}ms`
        }
      }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// =====================================
// FUNCIONES DE VALIDACIÓN MEJORADAS
// =====================================

function validateReportRequest(body: ReportRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const validTypes = [
    'validation-progress', 'final-results', 'audit-report',
    'executive-summary', 'performance-dashboard', 'user-activity',
    'document-status', 'audit-trail', 'compliance-report',
    'security-report', 'system-performance', 'processing-times'
  ];
  
  const validFormats = ['PDF', 'EXCEL', 'JSON'];
  
  if (!body.type || !validTypes.includes(body.type)) {
    errors.push('Tipo de reporte inválido o no soportado');
  }
  
  if (!body.format || !validFormats.includes(body.format)) {
    errors.push('Formato inválido');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// =====================================
// FUNCIONES MEJORADAS DE GENERACIÓN
// =====================================

function getProcessingTime(type: string): number {
  const processingTimes = {
    'validation-progress': 1000,
    'final-results': 1500,
    'audit-report': 2000,
    'executive-summary': 2500,
    'performance-dashboard': 3000,
    'user-activity': 1800,
    'document-status': 1200,
    'audit-trail': 3500,
    'compliance-report': 4000,
    'security-report': 2200,
    'system-performance': 2800,
    'processing-times': 1600
  };
  
  return processingTimes[type as keyof typeof processingTimes] || 1500;
}

function getReportCategory(type: string): string {
  const categories = {
    'executive-summary': 'executive',
    'performance-dashboard': 'performance',
    'validation-progress': 'operational',
    'user-activity': 'operational', 
    'document-status': 'operational',
    'audit-trail': 'audit',
    'compliance-report': 'audit',
    'security-report': 'audit',
    'system-performance': 'performance',
    'processing-times': 'performance',
    'final-results': 'executive',
    'audit-report': 'audit'
  };
  
  return categories[type as keyof typeof categories] || 'operational';
}

function getReportComplexity(type: string): string {
  const complexities = {
    'document-status': 'simple',
    'validation-progress': 'medium',
    'user-activity': 'medium',
    'processing-times': 'medium',
    'executive-summary': 'medium',
    'security-report': 'medium',
    'final-results': 'medium',
    'performance-dashboard': 'complex',
    'audit-trail': 'complex',
    'compliance-report': 'complex',
    'system-performance': 'complex',
    'audit-report': 'complex'
  };
  
  return complexities[type as keyof typeof complexities] || 'medium';
}

function getReportDataSources(type: string): string[] {
  const dataSources = {
    'executive-summary': ['users', 'documents', 'validations', 'contests'],
    'performance-dashboard': ['performance_metrics', 'system_logs', 'api_calls'],
    'validation-progress': ['validations', 'documents', 'users'],
    'user-activity': ['user_sessions', 'user_actions', 'documents'],
    'document-status': ['documents', 'validations', 'postulants'],
    'audit-trail': ['audit_logs', 'user_actions', 'system_logs'],
    'compliance-report': ['validations', 'documents', 'deadlines', 'procedures'],
    'security-report': ['security_logs', 'access_logs', 'failed_logins'],
    'system-performance': ['system_metrics', 'database_stats', 'server_logs'],
    'processing-times': ['processing_times', 'api_metrics', 'queue_stats']
  };
  
  return dataSources[type as keyof typeof dataSources] || ['documents', 'users'];
}

function generateEnhancedMockData(type: string, filters: any): any[] {
  // Base mock data size depends on report type
  const dataSizes = {
    'executive-summary': 50,
    'performance-dashboard': 100,
    'validation-progress': 250,
    'user-activity': 300,
    'document-status': 400,
    'audit-trail': 500,
    'compliance-report': 200,
    'security-report': 150,
    'system-performance': 80,
    'processing-times': 120
  };
  
  const baseSize = dataSizes[type as keyof typeof dataSizes] || 100;
  
  // Generate mock data array
  return Array.from({ length: baseSize }, (_, index) => ({
    id: `record_${index}`,
    type: type,
    timestamp: new Date().toISOString(),
    value: Math.random() * 100,
    status: Math.random() > 0.7 ? 'active' : 'processed'
  }));
}

function generateEnhancedFileName(type: string, format: string, timestamp: string): string {
  const date = new Date(timestamp);
  const dateStr = date.toISOString().split('T')[0];
  
  const typeNames = {
    'executive-summary': 'resumen_ejecutivo',
    'performance-dashboard': 'dashboard_rendimiento',
    'validation-progress': 'progreso_validacion',
    'user-activity': 'actividad_usuarios',
    'document-status': 'estado_documentos',
    'audit-trail': 'pista_auditoria',
    'compliance-report': 'reporte_cumplimiento',
    'security-report': 'reporte_seguridad',
    'system-performance': 'rendimiento_sistema',
    'processing-times': 'tiempos_procesamiento',
    'final-results': 'resultados_finales',
    'audit-report': 'auditoria'
  };
  
  const typeName = typeNames[type as keyof typeof typeNames] || type;
  const extension = format.toLowerCase() === 'pdf' ? 'pdf' : 
                   format.toLowerCase() === 'excel' ? 'xlsx' : 'json';
  
  return `${typeName}_${dateStr}.${extension}`;
}

function estimateEnhancedFileSize(recordCount: number, format: string, type: string): string {
  let baseSize;
  
  // Base size depends on format
  switch (format) {
    case 'PDF':
      baseSize = 15 + (recordCount * 0.05); // KB
      break;
    case 'EXCEL':
      baseSize = 25 + (recordCount * 0.08); // KB  
      break;
    case 'JSON':
      baseSize = 5 + (recordCount * 0.02); // KB
      break;
    default:
      baseSize = 10;
  }
  
  // Complex reports are larger
  const complexity = getReportComplexity(type);
  const multiplier = complexity === 'complex' ? 1.5 : 
                    complexity === 'medium' ? 1.2 : 1.0;
  
  const finalSize = Math.round(baseSize * multiplier);
  
  return finalSize > 1024 ? `${Math.round(finalSize / 1024 * 10) / 10} MB` : `${finalSize} KB`;
}

// =====================================
// FUNCIONES DE UTILIDAD LEGADAS
// =====================================

function generateMockData(type: string, filters: any): any[] {
  return generateEnhancedMockData(type, filters);
}

function generateFileName(type: string, format: string, timestamp: string): string {
  return generateEnhancedFileName(type, format, timestamp);
}

function estimateFileSize(recordCount: number, format: string): string {
  return estimateEnhancedFileSize(recordCount, format, 'medium');
}
