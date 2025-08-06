// src/app/api/dashboard/metrics/route.ts
import { NextResponse } from 'next/server';
import { executeQuery } from '@/services/database';
import { withCache, CACHE_KEYS } from '@/lib/cache-utils';
import type { RowDataPacket } from 'mysql2';

async function fetchDashboardMetrics() {
  // Execute optimized queries in parallel
  const [
    usersResult,
    contestsResult,
    documentsResult,
    inscriptionsResult,
    storageResult
  ] = await Promise.all([
    // Total registered users
    executeQuery('SELECT COUNT(*) as total FROM users') as Promise<[RowDataPacket[], any]>,
    
    // Active contests (assuming status field exists)
    executeQuery(`
      SELECT COUNT(*) as total 
      FROM contests 
      WHERE status = 'active' OR status = 'ACTIVE'
    `) as Promise<[RowDataPacket[], any]>,
    
    // Total documents processed
    executeQuery('SELECT COUNT(*) as total FROM documents') as Promise<[RowDataPacket[], any]>,
    
    // Total inscriptions
    executeQuery('SELECT COUNT(*) as total FROM inscriptions') as Promise<[RowDataPacket[], any]>,
    
    // Storage calculation (approximate based on document count and average size)
    executeQuery(`
      SELECT 
        COUNT(*) as document_count,
        COALESCE(SUM(CASE WHEN file_size IS NOT NULL THEN file_size ELSE 0 END), 0) as total_size_bytes
      FROM documents
    `) as Promise<[RowDataPacket[], any]>
  ]);

  // Extract results
  const totalUsers = usersResult[0][0]?.total || 0;
  const activeContests = contestsResult[0][0]?.total || 0;
  const totalDocuments = documentsResult[0][0]?.total || 0;
  const totalInscriptions = inscriptionsResult[0][0]?.total || 0;
  
  // Calculate storage (convert bytes to GB, fallback to estimate if no file_size data)
  const storageData = storageResult[0][0];
  let storageGB = 0;
  
  if (storageData?.total_size_bytes > 0) {
    storageGB = Number((storageData.total_size_bytes / (1024 * 1024 * 1024)).toFixed(1));
  } else {
    // Fallback: estimate based on document count (average 1.6MB per document)
    const estimatedBytes = (storageData?.document_count || 0) * 1.6 * 1024 * 1024;
    storageGB = Number((estimatedBytes / (1024 * 1024 * 1024)).toFixed(1));
  }

  return {
    activeUsers: totalUsers,
    activeContests: activeContests,
    processedDocs: totalDocuments,
    inscriptions: totalInscriptions,
    storageUsed: storageGB
  };
}

export async function GET() {
  try {
    const result = await withCache(
      CACHE_KEYS.DASHBOARD_METRICS,
      fetchDashboardMetrics
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard metrics',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}