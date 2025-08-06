// src/app/api/dashboard/contests/route.ts
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
    const cacheKey = 'dashboard-contests';
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const connection = await getDatabaseConnection();

    // Execute optimized queries for contest statistics
    const [
      totalContestsResult,
      activeContestsResult,
      contestsByStatusResult,
      recentContestsResult,
      contestsWithInscriptionsResult,
      contestsByTypeResult
    ] = await Promise.all([
      // Total contests
      connection.execute('SELECT COUNT(*) as total FROM contests') as Promise<[RowDataPacket[], any]>,
      
      // Active contests
      connection.execute(`
        SELECT COUNT(*) as total 
        FROM contests 
        WHERE status = 'active' OR status = 'ACTIVE'
      `) as Promise<[RowDataPacket[], any]>,
      
      // Contests by status
      connection.execute(`
        SELECT 
          status,
          COUNT(*) as count
        FROM contests 
        GROUP BY status
        ORDER BY count DESC
      `) as Promise<[RowDataPacket[], any]>,
      
      // Recent contests (last 30 days)
      connection.execute(`
        SELECT COUNT(*) as total
        FROM contests 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `) as Promise<[RowDataPacket[], any]>,
      
      // Contests with inscriptions count
      connection.execute(`
        SELECT 
          c.id,
          c.title,
          c.status,
          COUNT(i.id) as inscription_count
        FROM contests c
        LEFT JOIN inscriptions i ON c.id = i.contest_id
        GROUP BY c.id, c.title, c.status
        ORDER BY inscription_count DESC
        LIMIT 10
      `) as Promise<[RowDataPacket[], any]>,
      
      // Contests by type (if type field exists)
      connection.execute(`
        SELECT 
          COALESCE(type, 'Sin especificar') as type,
          COUNT(*) as count
        FROM contests 
        GROUP BY type
        ORDER BY count DESC
      `) as Promise<[RowDataPacket[], any]>
    ]);

    const contestStats = {
      total: totalContestsResult[0][0]?.total || 0,
      active: activeContestsResult[0][0]?.total || 0,
      recent: recentContestsResult[0][0]?.total || 0,
      byStatus: contestsByStatusResult[0].map(row => ({
        status: row.status,
        count: row.count
      })),
      byType: contestsByTypeResult[0].map(row => ({
        type: row.type,
        count: row.count
      })),
      topContests: contestsWithInscriptionsResult[0].map(row => ({
        id: row.id,
        title: row.title,
        status: row.status,
        inscriptionCount: row.inscription_count
      }))
    };

    // Cache the results
    setCachedData(cacheKey, contestStats);

    return NextResponse.json({
      ...contestStats,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching contest statistics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch contest statistics',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}