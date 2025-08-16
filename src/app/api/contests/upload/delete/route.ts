import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getDatabaseConnection } from '@/services/database';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contestId = searchParams.get('contestId');
    const fileType = searchParams.get('fileType'); // 'bases' o 'description'
    const filePath = searchParams.get('filePath'); // Ruta completa del archivo

    if (!contestId || !fileType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Faltan parámetros requeridos (contestId, fileType)' 
        },
        { status: 400 }
      );
    }

    // Validar que el fileType es correcto
    if (!['bases', 'description'].includes(fileType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tipo de archivo no válido. Debe ser "bases" o "description"' 
        },
        { status: 400 }
      );
    }

    const connection = await getDatabaseConnection();

    // Verificar que el concurso existe
    const [existingContest] = await connection.execute(
      'SELECT id, bases_url, description_url FROM contests WHERE id = ?',
      [contestId]
    ) as [RowDataPacket[], any];

    if (existingContest.length === 0) {
      await connection.end();
      return NextResponse.json(
        {
          success: false,
          error: 'Concurso no encontrado',
        },
        { status: 404 }
      );
    }

    const contest = existingContest[0];
    const currentUrl = fileType === 'bases' ? contest.bases_url : contest.description_url;

    if (!currentUrl) {
      await connection.end();
      return NextResponse.json(
        {
          success: false,
          error: 'No hay archivo para eliminar',
        },
        { status: 404 }
      );
    }

    // Construir ruta del archivo basada en la URL o usar la ruta proporcionada
    let fileToDelete: string;
    
    if (filePath) {
      // Si se proporciona la ruta completa, usarla directamente
      fileToDelete = join(process.cwd(), 'public', filePath.replace(/^\//, ''));
    } else {
      // Construir ruta basada en la URL del concurso
      fileToDelete = join(process.cwd(), 'public', currentUrl.replace(/^\//, ''));
    }

    // Verificar que el archivo existe antes de intentar eliminarlo
    if (existsSync(fileToDelete)) {
      try {
        await unlink(fileToDelete);
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Continuamos con la actualización de la base de datos aunque falle la eliminación del archivo
      }
    }

    // Actualizar la base de datos para remover la URL
    const updateQuery = fileType === 'bases' 
      ? 'UPDATE contests SET bases_url = NULL, updated_at = NOW() WHERE id = ?'
      : 'UPDATE contests SET description_url = NULL, updated_at = NOW() WHERE id = ?';

    const [result] = await connection.execute(updateQuery, [contestId]) as [ResultSetHeader, any];

    await connection.end();

    if (result.affectedRows === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo actualizar el concurso',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Archivo ${fileType === 'bases' ? 'de bases' : 'de descripción'} eliminado exitosamente`,
      data: {
        contestId,
        fileType,
        removedUrl: currentUrl
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor al eliminar el archivo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// También podemos manejar POST para compatibilidad con algunos clientes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contestId, fileType, filePath } = body;

    if (!contestId || !fileType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Faltan parámetros requeridos (contestId, fileType)' 
        },
        { status: 400 }
      );
    }

    // Crear una nueva URL con los parámetros y llamar a DELETE
    const url = new URL(request.url);
    url.searchParams.set('contestId', contestId);
    url.searchParams.set('fileType', fileType);
    if (filePath) {
      url.searchParams.set('filePath', filePath);
    }

    // Crear un nuevo request con método DELETE
    const deleteRequest = new NextRequest(url.toString(), {
      method: 'DELETE',
      headers: request.headers
    });

    return DELETE(deleteRequest);

  } catch (error) {
    console.error('Error in POST handler:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
