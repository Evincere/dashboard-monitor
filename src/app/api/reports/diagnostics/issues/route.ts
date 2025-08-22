// ================================================
// API ENDPOINT - PROBLEMAS TÉCNICOS DETECTADOS
// ================================================

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { ReportDataService } from '@/lib/reports/services/ReportDataService';
import type { ReportFilter } from '@/lib/reports/types/index';

// Cache para issues (2 minutos - más dinámico)
const CACHE_DURATION = 2 * 60 * 1000;
let cachedIssues: any = null;
let cacheTimestamp = 0;
let cacheKey = '';

// =====================================
// GET - PROBLEMAS TÉCNICOS
// =====================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Crear filtros
    const filters: ReportFilter = {};
    if (from && to) {
      filters.dateRange = {
        from: new Date(from),
        to: new Date(to)
      };
    }

    // Generar key de cache basado en filtros
    const currentCacheKey = JSON.stringify(filters);
    const now = Date.now();

    // Verificar cache válido
    if (cachedIssues &&
      cacheKey === currentCacheKey &&
      (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json(cachedIssues, {
        headers: {
          'Cache-Control': 'public, s-maxage=120', // 2 minutos
          'X-Cache-Status': 'HIT',
          'X-Data-Count': cachedIssues.length.toString()
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
      // Crear servicio y obtener issues
      const reportService = new ReportDataService(connection);
      const issues = await reportService.getTechnicalIssues(filters);

      // Actualizar cache
      cachedIssues = issues;
      cacheTimestamp = now;
      cacheKey = currentCacheKey;

      // Estadísticas para headers
      const stats = {
        total: issues.length,
        high: issues.filter(i => i.severity === 'HIGH').length,
        recoverable: issues.filter(i => i.isRecoverable).length,
        recent: issues.filter(i =>
          new Date(i.detectedAt).getTime() > (now - 24 * 60 * 60 * 1000)
        ).length
      };

      return NextResponse.json(issues, {
        headers: {
          'Cache-Control': 'public, s-maxage=120',
          'X-Cache-Status': 'MISS',
          'X-Data-Count': issues.length.toString(),
          'X-High-Severity': stats.high.toString(),
          'X-Recoverable': stats.recoverable.toString(),
          'X-Recent-24h': stats.recent.toString(),
          'X-Data-Timestamp': new Date().toISOString()
        }
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Error fetching technical issues:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch technical issues',
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
// POST - INVALIDAR CACHE ESPECÍFICO
// =====================================

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    // Invalidar cache específico
    cachedIssues = null;
    cacheTimestamp = 0;
    cacheKey = '';

    return NextResponse.json({
      success: true,
      message: 'Technical issues cache invalidated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error invalidating technical issues cache:', error);

    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    );
  }
}
