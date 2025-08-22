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

export async function GET(
  request: NextRequest, 
  { params }: { params: { reportId: string } }
) {
  let connection: mysql.Connection | null = null;

  try {
    const resolvedParams = await params;
    const reportId = resolvedParams.reportId;

    if (!reportId) {
      return NextResponse.json({
        success: false,
        error: 'ID de reporte requerido'
      }, { status: 400 });
    }

    connection = await mysql.createConnection(dbConfig);

    // Obtener detalles del reporte (usando estructura existente)
    const [rows] = await connection.execute(`
      SELECT id, reportType, format, status, filePath, fileSize, downloadCount
      FROM generated_reports 
      WHERE id = ?
    `, [reportId]);

    const reports = rows as any[];
    
    if (reports.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Reporte no encontrado'
      }, { status: 404 });
    }

    const report = reports[0];

    if (report.status !== 'COMPLETED') {
      return NextResponse.json({
        success: false,
        error: 'El reporte aún está en proceso de generación'
      }, { status: 400 });
    }

    // Incrementar contador de descargas
    await connection.execute(`
      UPDATE generated_reports 
      SET downloadCount = downloadCount + 1 
      WHERE id = ?
    `, [reportId]);

    // Para esta implementación simplificada, generamos contenido de ejemplo
    const sampleContent = generateSampleReportContent(report.reportType, report.format);
    
    // Determinar tipo de contenido
    let contentType = 'application/octet-stream';
    let fileExtension = 'txt';
    
    switch (report.format?.toUpperCase()) {
      case 'PDF':
        contentType = 'application/pdf';
        fileExtension = 'pdf';
        break;
      case 'EXCEL':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
        break;
      case 'CSV':
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
      case 'JSON':
        contentType = 'application/json';
        fileExtension = 'json';
        break;
    }

    const filename = `reporte_${report.reportType}_${reportId.substring(0, 8)}.${fileExtension}`;

    return new NextResponse(sampleContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': sampleContent.length.toString()
      }
    });

  } catch (error) {
    console.error('Error downloading report:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al descargar el reporte',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });

  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

function generateSampleReportContent(reportType: string, format: string): string {
  const timestamp = new Date().toLocaleString('es-ES');
  
  switch (format?.toUpperCase()) {
    case 'CSV':
      return `ID,Nombre,DNI,Estado,Fecha\n1,Juan Pérez,12345678,Aprobado,${timestamp}\n2,María García,87654321,Pendiente,${timestamp}\n`;
    
    case 'JSON':
      return JSON.stringify({
        metadata: {
          reportType,
          generatedAt: timestamp,
          totalRecords: 2
        },
        data: [
          { id: 1, nombre: 'Juan Pérez', dni: '12345678', estado: 'Aprobado', fecha: timestamp },
          { id: 2, nombre: 'María García', dni: '87654321', estado: 'Pendiente', fecha: timestamp }
        ]
      }, null, 2);
    
    default:
      return `REPORTE: ${reportType}\nGenerado el: ${timestamp}\n\nContenido de ejemplo:\n- Juan Pérez (12345678): Aprobado\n- María García (87654321): Pendiente\n\nEste es un reporte de demostración.`;
  }
}
