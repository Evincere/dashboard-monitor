// src/app/api/dashboard/inscriptions/route.ts
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
    const cacheKey = 'dashboard-inscriptions';
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const connection = await getDatabaseConnection();

    // Execute optimized queries for inscription statistics
    const [
      totalInscriptionsResult,
      inscriptionsByStatusResult,
      recentInscriptionsResult,
      inscriptionsByContestResult,
      inscriptionGrowthResult,
      inscriptionsByMonthResult
    ] = await Promise.all([
      // Total inscriptions
      connection.execute('SELECT COUNT(*) as total FROM inscriptions') as Promise<[RowDataPacket[], any]>,
      
      // Inscriptions by status
      connection.execute(`
        SELECT 
          COALESCE(status, 'Sin especificar') as status,
          COUNT(*) as count
        FROM inscriptions 
        GROUP BY status
        ORDER BY count DESC
      `) as Promise<[RowDataPacket[], any]>,
      
      // Recent inscriptions (last 30 days)
      connection.execute(`
        SELECT COUNT(*) as total
        FROM inscriptions 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `) as Promise<[RowDataPacket[], any]>,
      
      // Inscriptions by contest (top 10)
      connection.execute(`
        SELECT 
          c.title as contest_title,
          c.id as contest_id,
          COUNT(i.id) as inscription_count
        FROM inscriptions i
        JOIN contests c ON i.contest_id = c.id
        GROUP BY c.id, c.title
        ORDER BY inscription_count DESC
        LIMIT 10
      `) as Promise<[RowDataPacket[], any]>,
      
      // Inscription growth (last 6 months)
      connection.execute(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as count
        FROM inscriptions 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month ASC
      `) as Promise<[RowDataPacket[], any]>,
      
      // Inscriptions by month (current year)
      connection.execute(`
        SELECT 
          MONTH(created_at) as month,
          MONTHNAME(created_at) as month_name,
          COUNT(*) as count
        FROM inscriptions 
        WHERE YEAR(created_at) = YEAR(NOW())
        GROUP BY MONTH(created_at), MONTHNAME(created_at)
        ORDER BY month ASC
      `) as Promise<[RowDataPacket[], any]>
    ]);

    const inscriptionStats = {
      total: totalInscriptionsResult[0][0]?.total || 0,
      recent: recentInscriptionsResult[0][0]?.total || 0,
      byStatus: inscriptionsByStatusResult[0].map(row => ({
        status: row.status,
        count: row.count
      })),
      byContest: inscriptionsByContestResult[0].map(row => ({
        contestId: row.contest_id,
        contestTitle: row.contest_title,
        count: row.inscription_count
      })),
      growth: inscriptionGrowthResult[0].map(row => ({
        month: row.month,
        count: row.count
      })),
      byMonth: inscriptionsByMonthResult[0].map(row => ({
        month: row.month,
        monthName: row.month_name,
        count: row.count
      }))
    };

    // Cache the results
    setCachedData(cacheKey, inscriptionStats);

    return NextResponse.json({
      ...inscriptionStats,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching inscription statistics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch inscription statistics',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}