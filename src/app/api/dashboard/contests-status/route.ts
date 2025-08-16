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

interface ContestStatus {
  status: string;
  count: number;
  percentage: number;
  label: string;
  contests?: {
    id: number;
    title: string;
    category: string;
    department: string;
    startDate: string | null;
    endDate: string | null;
    inscriptionStartDate: string | null;
    inscriptionEndDate: string | null;
  }[];
}

// Map database status to Spanish labels
const statusLabels: { [key: string]: string } = {
  'ACTIVE': 'Activo',
  'ARCHIVED': 'Archivado',
  'CANCELLED': 'Cancelado',
  'CLOSED': 'Cerrado',
  'DRAFT': 'Borrador',
  'FINISHED': 'Finalizado',
  'IN_EVALUATION': 'En Evaluación',
  'PAUSED': 'Pausado',
  'RESULTS_PUBLISHED': 'Resultados Publicados',
  'SCHEDULED': 'Programado'
};

async function getContestsByStatus(): Promise<ContestStatus[]> {
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(dbConfig);

    // Get contests count by status
    const [contestsResult] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM contests
      WHERE status IS NOT NULL
      GROUP BY status
      ORDER BY count DESC
    `);

    const contests = contestsResult as any[];
    const totalContests = contests.reduce((sum, contest) => sum + contest.count, 0);

    // Get detailed information for each status
    const statusWithDetails: ContestStatus[] = [];
    
    for (const contestGroup of contests) {
      // Get detailed contest information for this status
      const [detailsResult] = await connection.execute(`
        SELECT 
          id,
          title,
          category,
          department,
          start_date as startDate,
          end_date as endDate,
          inscription_start_date as inscriptionStartDate,
          inscription_end_date as inscriptionEndDate
        FROM contests
        WHERE status = ?
        ORDER BY created_at DESC
      `, [contestGroup.status]);
      
      const contestDetails = detailsResult as any[];
      
      statusWithDetails.push({
        status: contestGroup.status,
        count: contestGroup.count,
        percentage: totalContests > 0 ? Number(((contestGroup.count / totalContests) * 100).toFixed(1)) : 0,
        label: statusLabels[contestGroup.status] || contestGroup.status,
        contests: contestDetails
      });
    }

    return statusWithDetails;

  } catch (error) {
    console.error('Error fetching contests by status:', error);
    return [];
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const contestsByStatus = await getContestsByStatus();

    return NextResponse.json({
      success: true,
      data: contestsByStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Contests by status API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch contests by status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
