// src/app/api/performance/route.ts

/**
 * @fileOverview Performance metrics and monitoring API endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '../../../lib/performance-monitor';
import { getPoolStats } from '../../../services/database';
import { distributedCache } from '../../../lib/redis-cache';
import { queryOptimizer } from '../../../lib/query-optimizer';

/**
 * GET /api/performance - Get performance metrics and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeWindow = parseInt(searchParams.get('timeWindow') || '300000'); // 5 minutes default
    const includeRecommendations = searchParams.get('recommendations') === 'true';

    // Get performance statistics
    const performanceStats = performanceMonitor.getStats(timeWindow);
    
    // Get database pool statistics
    const dbStats = getPoolStats();
    
    // Get cache statistics
    const cacheStats = await distributedCache.getStats();
    const cacheHealth = await distributedCache.healthCheck();
    
    // Get slow queries
    const slowQueries = performanceMonitor.getSlowQueries(10);
    const errorQueries = performanceMonitor.getErrorQueries(5);

    let recommendations = null;
    if (includeRecommendations) {
      recommendations = await queryOptimizer.getDatabaseRecommendations();
    }

    // System metrics
    const systemMetrics = {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };

    const response = {
      timestamp: new Date().toISOString(),
      timeWindow,
      performance: performanceStats,
      database: {
        pool: dbStats,
        slowQueries: slowQueries.map(q => ({
          query: q.query.substring(0, 100) + '...',
          duration: q.duration,
          timestamp: new Date(q.timestamp).toISOString()
        })),
        errorQueries: errorQueries.map(q => ({
          query: q.query.substring(0, 100) + '...',
          error: q.error,
          timestamp: new Date(q.timestamp).toISOString()
        }))
      },
      cache: {
        stats: cacheStats,
        health: cacheHealth
      },
      system: systemMetrics,
      recommendations
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Performance API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve performance metrics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/performance/clear - Clear performance metrics
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'clear_metrics':
        performanceMonitor.clear();
        break;
      
      case 'clear_cache':
        await distributedCache.clear();
        break;
      
      case 'clear_query_cache':
        queryOptimizer.clearCache();
        break;
      
      case 'clear_all':
        performanceMonitor.clear();
        await distributedCache.clear();
        queryOptimizer.clearCache();
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: clear_metrics, clear_cache, clear_query_cache, or clear_all' },
          { status: 400 }
        );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully executed: ${action}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Performance API] Clear error:', error);
    return NextResponse.json(
      { error: 'Failed to clear performance data' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/performance/prometheus - Export metrics in Prometheus format
 */
