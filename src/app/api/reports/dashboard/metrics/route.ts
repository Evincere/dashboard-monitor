// ================================================
// API ENDPOINT - MÉTRICAS DASHBOARD REPORTES
// ================================================

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { ReportDataService } from '@/lib/reports/services/ReportDataService';

// Cache para métricas (5 minutos)
const CACHE_DURATION = 5 * 60 * 1000;
let cachedMetrics: any = null;
let cacheTimestamp = 0;

// =====================================
// GET - MÉTRICAS DEL DASHBOARD
// =====================================

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Reports API] Starting dashboard metrics request...');
    
    // Verificar cache válido
    const now = Date.now();
    if (cachedMetrics && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('✅ [Reports API] Cache hit, returning cached metrics');
      return NextResponse.json(cachedMetrics, {
        headers: {
          'Cache-Control': 'public, s-maxage=300', // 5 minutos
          'X-Cache-Status': 'HIT'
        }
      });
    }

    console.log('🔧 [Reports API] Cache miss, fetching fresh data...');

    // Usar misma configuración de DB que otros endpoints
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'mpd_concursos', // ✅ Corregido
      port: parseInt(process.env.DB_PORT || '3307') // ✅ Puerto correcto
    };

    console.log(`📊 [Reports API] Connecting to DB: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

    // Conectar a la base de datos
    const connection = await mysql.createConnection(dbConfig);

    try {
      console.log('✅ [Reports API] DB connection successful, creating report service...');
      
      // Crear servicio y obtener métricas
      const reportService = new ReportDataService(connection);
      const metrics = await reportService.getDashboardMetrics();

      console.log('✅ [Reports API] Metrics obtained successfully:', {
        totalUsers: metrics.totalUsers,
        totalDocuments: metrics.totalDocuments,
        progress: metrics.processingProgress
      });

      // Actualizar cache
      cachedMetrics = metrics;
      cacheTimestamp = now;

      return NextResponse.json(metrics, {
        headers: {
          'Cache-Control': 'public, s-maxage=300',
          'X-Cache-Status': 'MISS',
          'X-Data-Timestamp': new Date().toISOString()
        }
      });

    } finally {
      await connection.end();
      console.log('🔧 [Reports API] DB connection closed');
    }

  } catch (error) {
    console.error('❌ [Reports API] Error fetching dashboard metrics:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store'
        }
      }
    );
  }
}

// =====================================
// POST - INVALIDAR CACHE (PARA ADMIN)
// =====================================

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [Reports API] Cache invalidation request received');
    
    // Nota: Por ahora no verificamos autorización para facilitar desarrollo
    // En producción, aquí se debería verificar el token de admin
    const authHeader = request.headers.get('Authorization');
    console.log(`🔐 [Reports API] Auth header present: ${!!authHeader}`);

    // Invalidar cache
    cachedMetrics = null;
    cacheTimestamp = 0;

    console.log('✅ [Reports API] Cache invalidated successfully');

    return NextResponse.json({
      success: true,
      message: 'Cache invalidated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Reports API] Error invalidating cache:', error);
    
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    );
  }
}
