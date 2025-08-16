import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const contestId = formData.get('contestId') as string;
    const fileType = formData.get('fileType') as string; // 'bases' o 'description'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se encontró archivo' },
        { status: 400 }
      );
    }

    if (!contestId || !fileType) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Solo se permiten archivos PDF y Word' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'El archivo no puede superar los 10MB' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Crear directorio si no existe
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'contests', contestId);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generar nombre de archivo
    const fileExtension = file.name.split('.').pop();
    const fileName = `${fileType}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    // Guardar archivo
    await writeFile(filePath, buffer);

    // Retornar URL relativa
    const fileUrl = `/uploads/contests/${contestId}/${fileName}`;

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        fileName,
        fileSize: file.size,
        fileType: file.type
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor al subir el archivo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
