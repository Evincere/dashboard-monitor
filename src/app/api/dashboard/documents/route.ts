// src/app/api/dashboard/documents/route.ts
import { NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/services/database';
import type { RowDataPacket } from 'mysql2';

// Simple in-memory cache
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

function getCachedData(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

export async function GET() {
  try {
    // Check cache first
    const cacheKey = 'dashboard-documents';
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const connection = await getDatabaseConnection();

    // Execute optimized queries for document statistics
    const [
      totalDocumentsResult,
      documentsByTypeResult,
      documentsByStatusResult,
      recentDocumentsResult,
      storageStatsResult,
      documentsByUserResult
    ] = await Promise.all([
      // Total documents
      connection.execute('SELECT COUNT(*) as total FROM documents') as Promise<[RowDataPacket[], any]>,
      
      // Documents by type
      connection.execute(`
        SELECT 
          COALESCE(document_type, 'Sin especificar') as type,
          COUNT(*) as count
        FROM documents 
        GROUP BY document_type
        ORDER BY count DESC
      `) as Promise<[RowDataPacket[], any]>,
      
      // Documents by validation status
      connection.execute(`
        SELECT 
          COALESCE(validation_status, 'Sin validar') as status,
          COUNT(*) as count
        FROM documents 
        GROUP BY validation_status
        ORDER BY count DESC
      `) as Promise<[RowDataPacket[], any]>,
      
      // Recent documents (last 30 days)
      connection.execute(`
        SELECT COUNT(*) as total
        FROM documents 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `) as Promise<[RowDataPacket[], any]>,
      
      // Storage statistics
      connection.execute(`
        SELECT 
          COUNT(*) as total_files,
          COALESCE(SUM(CASE WHEN file_size IS NOT NULL THEN file_size ELSE 0 END), 0) as total_size_bytes,
          COALESCE(AVG(CASE WHEN file_size IS NOT NULL THEN file_size ELSE NULL END), 0) as avg_size_bytes,
          COALESCE(MAX(file_size), 0) as max_size_bytes,
          COALESCE(MIN(CASE WHEN file_size > 0 THEN file_size ELSE NULL END), 0) as min_size_bytes
        FROM documents
      `) as Promise<[RowDataPacket[], any]>,
      
      // Top users by document count
      connection.execute(`
        SELECT 
          u.name as user_name,
          u.email as user_email,
          COUNT(d.id) as document_count
        FROM documents d
        JOIN users u ON d.user_id = u.id
        GROUP BY u.id, u.name, u.email
        ORDER BY document_count DESC
        LIMIT 10
      `) as Promise<[RowDataPacket[], any]>
    ]);

    // Process storage statistics
    const storageData = storageStatsResult[0][0];
    const totalSizeGB = Number((storageData?.total_size_bytes / (1024 * 1024 * 1024)).toFixed(2));
    const avgSizeMB = Number((storageData?.avg_size_bytes / (1024 * 1024)).toFixed(2));
    const maxSizeMB = Number((storageData?.max_size_bytes / (1024 * 1024)).toFixed(2));
    const minSizeMB = Number((storageData?.min_size_bytes / (1024 * 1024)).toFixed(2));

    const documentStats = {
      total: totalDocumentsResult[0][0]?.total || 0,
      recent: recentDocumentsResult[0][0]?.total || 0,
      byType: documentsByTypeResult[0].map(row => ({
        type: row.type,
        count: row.count
      })),
      byStatus: documentsByStatusResult[0].map(row => ({
        status: row.status,
        count: row.count
      })),
      storage: {
        totalFiles: storageData?.total_files || 0,
        totalSizeGB: totalSizeGB,
        avgSizeMB: avgSizeMB,
        maxSizeMB: maxSizeMB,
        minSizeMB: minSizeMB
      },
      topUsers: documentsByUserResult[0].map(row => ({
        userName: row.user_name,
        userEmail: row.user_email,
        documentCount: row.document_count
      }))
    };

    // Cache the results
    setCachedData(cacheKey, documentStats);

    return NextResponse.json({
      ...documentStats,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching document statistics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch document statistics',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}