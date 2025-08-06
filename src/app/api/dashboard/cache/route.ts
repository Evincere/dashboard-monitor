// src/app/api/dashboard/cache/route.ts
import { NextResponse } from 'next/server';
import { dashboardCache } from '@/lib/cache-utils';

export async function GET() {
  try {
    const stats = dashboardCache.getStats();
    
    return NextResponse.json({
      status: 'success',
      cache: {
        ...stats,
        entries: stats.keys.map(key => ({
          key,
          data: dashboardCache.get(key) ? 'cached' : 'expired'
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch cache statistics',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    dashboardCache.clear();
    
    return NextResponse.json({
      status: 'success',
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear cache',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}