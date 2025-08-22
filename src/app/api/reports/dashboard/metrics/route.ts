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
    // Verificar cache válido
    const now = Date.now();
    if (cachedMetrics && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json(cachedMetrics, {
        headers: {
          'Cache-Control': 'public, s-maxage=300', // 5 minutos
          'X-Cache-Status': 'HIT'
        }
      });
    }

    // Conectar a la base de datos
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dashboard_monitor',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    try {
      // Crear servicio y obtener métricas
      const reportService = new ReportDataService(connection);
      const metrics = await reportService.getDashboardMetrics();

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
    }

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    
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
    // Verificar autorización (aquí podrías añadir middleware de auth)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    // Invalidar cache
    cachedMetrics = null;
    cacheTimestamp = 0;

    return NextResponse.json({
      success: true,
      message: 'Cache invalidated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error invalidating cache:', error);
    
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    );
  }
}
