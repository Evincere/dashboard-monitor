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

interface Contest {
  id: number;
  title: string;
  category: string;
  department: string;
  status: string;
  inscriptionCount: number;
  startDate: string | null;
  endDate: string | null;
  inscriptionStartDate: string | null;
  inscriptionEndDate: string | null;
}

async function getContestsList(): Promise<Contest[]> {
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(dbConfig);

    // Get all contests with inscription count and all fields
    const [contestsResult] = await connection.execute(`
      SELECT 
        c.id,
        c.title,
        c.category,
        c.class_,
        c.department,
        c.position,
        c.functions,
        c.status,
        c.start_date as startDate,
        c.end_date as endDate,
        c.inscription_start_date as inscriptionStartDate,
        c.inscription_end_date as inscriptionEndDate,
        c.bases_url,
        c.description_url,
        COUNT(i.id) as inscriptionCount
      FROM contests c
      LEFT JOIN inscriptions i ON i.contest_id = c.id
      GROUP BY c.id, c.title, c.category, c.class_, c.department, c.position, c.functions, c.status, 
               c.start_date, c.end_date, c.inscription_start_date, c.inscription_end_date, c.bases_url, c.description_url
      ORDER BY c.created_at DESC
    `);

    return contestsResult as Contest[];

  } catch (error) {
    console.error('Error fetching contests list:', error);
    return [];
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const contests = await getContestsList();

    return NextResponse.json({
      success: true,
      data: contests,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Contests list API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch contests list',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
