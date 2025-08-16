import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/services/database';
import { validateContest, createContestSchema, updateContestSchema } from '@/lib/validations/contest-validation';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

// Interfaces
interface Contest {
  id?: number;
  title: string;
  category?: string;
  class_?: string;
  department?: string;
  position?: string;
  functions?: string;
  status: string;
  start_date?: Date | null;
  end_date?: Date | null;
  inscription_start_date: Date;
  inscription_end_date: Date;
  bases_url?: string;
  description_url?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Helper function to format dates for MySQL
function formatDateForMySQL(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// Helper function to parse dates from MySQL
function parseDateFromMySQL(dateString: string | null): Date | null {
  if (!dateString) return null;
  return new Date(dateString);
}

// GET - Obtener todos los concursos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100); // Max 100
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const department = searchParams.get('department');

    const connection = await getDatabaseConnection();

    // Construir consulta base
    let query = `
      SELECT 
        id, title, category, class_, department, position, functions,
        status, start_date, end_date, inscription_start_date, inscription_end_date,
        bases_url, description_url, created_at, updated_at
      FROM contests
      WHERE 1=1
    `;

    const queryParams: any[] = [];

    // Agregar filtros
    if (status) {
      query += ' AND status = ?';
      queryParams.push(status);
    }

    if (search) {
      query += ' AND (title LIKE ? OR position LIKE ? OR functions LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (category) {
      query += ' AND category = ?';
      queryParams.push(category);
    }

    if (department) {
      query += ' AND department LIKE ?';
      queryParams.push(`%${department}%`);
    }

    // Agregar ordenamiento y paginación
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    // Ejecutar consulta principal
    const [rows] = await connection.execute(query, queryParams) as [RowDataPacket[], any];

    // Consulta para contar total
    let countQuery = 'SELECT COUNT(*) as total FROM contests WHERE 1=1';
    const countParams: any[] = [];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (search) {
      countQuery += ' AND (title LIKE ? OR position LIKE ? OR functions LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }

    if (department) {
      countQuery += ' AND department LIKE ?';
      countParams.push(`%${department}%`);
    }

    const [countResult] = await connection.execute(countQuery, countParams) as [RowDataPacket[], any];
    const total = countResult[0].total;

    // Formatear resultados
    const contests = rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      class_: row.class_,
      department: row.department,
      position: row.position,
      functions: row.functions,
      status: row.status,
      startDate: parseDateFromMySQL(row.start_date),
      endDate: parseDateFromMySQL(row.end_date),
      inscriptionStartDate: parseDateFromMySQL(row.inscription_start_date),
      inscriptionEndDate: parseDateFromMySQL(row.inscription_end_date),
      bases_url: row.bases_url,
      description_url: row.description_url,
      createdAt: parseDateFromMySQL(row.created_at),
      updatedAt: parseDateFromMySQL(row.updated_at)
    }));

    await connection.end();

    return NextResponse.json({
      success: true,
      data: contests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching contests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener los concursos',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo concurso
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos de entrada
    const validation = validateContest(body, false);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de validación incorrectos',
          errors: validation.errors,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const contestData = validation.data;
    const connection = await getDatabaseConnection();

    // Insertar nuevo concurso
    const insertQuery = `
      INSERT INTO contests (
        title, category, class_, department, position, functions,
        status, start_date, end_date, inscription_start_date, inscription_end_date,
        bases_url, description_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const insertParams = [
      contestData.title,
      contestData.category || null,
      contestData.class_ || null,
      contestData.department || null,
      contestData.position || null,
      contestData.functions || null,
      contestData.status,
      formatDateForMySQL(contestData.start_date),
      formatDateForMySQL(contestData.end_date),
      formatDateForMySQL(contestData.inscription_start_date),
      formatDateForMySQL(contestData.inscription_end_date),
      contestData.bases_url || null,
      contestData.description_url || null
    ];

    const [result] = await connection.execute(insertQuery, insertParams) as [ResultSetHeader, any];

    // Obtener el concurso creado
    const [newContest] = await connection.execute(
      'SELECT * FROM contests WHERE id = ?',
      [result.insertId]
    ) as [RowDataPacket[], any];

    await connection.end();

    if (newContest.length === 0) {
      throw new Error('No se pudo recuperar el concurso creado');
    }

    const contest = newContest[0];

    return NextResponse.json({
      success: true,
      message: 'Concurso creado exitosamente',
      data: {
        id: contest.id,
        title: contest.title,
        category: contest.category,
        class_: contest.class_,
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
      },
      timestamp: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating contest:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear el concurso',
        details: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// PUT - Actualizar concurso existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar que se incluye el ID
    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID del concurso es requerido',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Validar datos de entrada
    const validation = validateContest(body, true);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de validación incorrectos',
          errors: validation.errors,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const contestData = validation.data;
    const connection = await getDatabaseConnection();

    // Verificar que el concurso existe
    const [existingContest] = await connection.execute(
      'SELECT id FROM contests WHERE id = ?',
      [body.id]
    ) as [RowDataPacket[], any];

    if (existingContest.length === 0) {
      await connection.end();
      return NextResponse.json(
        {
          success: false,
          error: 'Concurso no encontrado',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // Actualizar concurso
    const updateQuery = `
      UPDATE contests SET
        title = ?, category = ?, class_ = ?, department = ?, position = ?, functions = ?,
        status = ?, start_date = ?, end_date = ?, inscription_start_date = ?, inscription_end_date = ?,
        bases_url = ?, description_url = ?, updated_at = NOW()
      WHERE id = ?
    `;

    const updateParams = [
      contestData.title,
      contestData.category || null,
      contestData.class_ || null,
      contestData.department || null,
      contestData.position || null,
      contestData.functions || null,
      contestData.status,
      formatDateForMySQL(contestData.start_date),
      formatDateForMySQL(contestData.end_date),
      formatDateForMySQL(contestData.inscription_start_date),
      formatDateForMySQL(contestData.inscription_end_date),
      contestData.bases_url || null,
      contestData.description_url || null,
      body.id
    ];

    await connection.execute(updateQuery, updateParams);

    // Obtener el concurso actualizado
    const [updatedContest] = await connection.execute(
      'SELECT * FROM contests WHERE id = ?',
      [body.id]
    ) as [RowDataPacket[], any];

    await connection.end();

    if (updatedContest.length === 0) {
      throw new Error('No se pudo recuperar el concurso actualizado');
    }

    const contest = updatedContest[0];

    return NextResponse.json({
      success: true,
      message: 'Concurso actualizado exitosamente',
      data: {
        id: contest.id,
        title: contest.title,
        category: contest.category,
        class_: contest.class_,
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
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating contest:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar el concurso',
        details: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar concurso
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID del concurso es requerido',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const connection = await getDatabaseConnection();

    // Verificar que el concurso existe
    const [existingContest] = await connection.execute(
      'SELECT id, title FROM contests WHERE id = ?',
      [id]
    ) as [RowDataPacket[], any];

    if (existingContest.length === 0) {
      await connection.end();
      return NextResponse.json(
        {
          success: false,
          error: 'Concurso no encontrado',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    const contestTitle = existingContest[0].title;

    // Verificar si hay inscripciones asociadas
    const [inscriptions] = await connection.execute(
      'SELECT COUNT(*) as count FROM inscriptions WHERE contest_id = ?',
      [id]
    ) as [RowDataPacket[], any];

    if (inscriptions[0].count > 0) {
      await connection.end();
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede eliminar el concurso porque tiene inscripciones asociadas',
          details: `El concurso "${contestTitle}" tiene ${inscriptions[0].count} inscripciones`,
          timestamp: new Date().toISOString()
        },
        { status: 409 }
      );
    }

    // Eliminar el concurso
    const [result] = await connection.execute(
      'DELETE FROM contests WHERE id = ?',
      [id]
    ) as [ResultSetHeader, any];

    await connection.end();

    if (result.affectedRows === 0) {
      throw new Error('No se pudo eliminar el concurso');
    }

    return NextResponse.json({
      success: true,
      message: `Concurso "${contestTitle}" eliminado exitosamente`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting contest:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar el concurso',
        details: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
