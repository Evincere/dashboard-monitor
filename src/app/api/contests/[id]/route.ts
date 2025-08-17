import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/services/database';
import type { RowDataPacket } from 'mysql2';

// Helper function to parse dates from MySQL
function parseDateFromMySQL(dateString: string | null): Date | null {
  if (!dateString) return null;
  return new Date(dateString);
}

// GET - Obtener un concurso específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID del concurso inválido',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const connection = await getDatabaseConnection();

    // Consultar el concurso específico
    const query = `
      SELECT 
        id, title, category, class_, department, position, functions,
        status, start_date, end_date, inscription_start_date, inscription_end_date,
        bases_url, description_url, created_at, updated_at
      FROM contests
      WHERE id = ?
    `;

    const [rows] = await connection.execute(query, [id]) as [RowDataPacket[], any];

    await connection.end();

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Concurso no encontrado',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    const contest = rows[0];

    // Formatear resultado
    const formattedContest = {
      id: contest.id,
      title: contest.title,
      category: contest.category,
      contestClass: contest.class_,
      department: contest.department,
      position: contest.position,
      functions: contest.functions,
      status: contest.status,
      startDate: parseDateFromMySQL(contest.start_date),
      endDate: parseDateFromMySQL(contest.end_date),
      inscriptionStartDate: parseDateFromMySQL(contest.inscription_start_date),
      inscriptionEndDate: parseDateFromMySQL(contest.inscription_end_date),
      bases_url: contest.bases_url,
      description_url: contest.description_url,
      createdAt: parseDateFromMySQL(contest.created_at),
      updatedAt: parseDateFromMySQL(contest.updated_at)
    };

    return NextResponse.json({
      success: true,
      data: formattedContest,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching contest:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener el concurso',
        details: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
