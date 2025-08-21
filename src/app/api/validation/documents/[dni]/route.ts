// src/app/api/validation/documents/[dni]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';

/**
 * @fileOverview API para servir documentos PDF desde archivos locales descargados
 * Accede directamente a la estructura de carpetas {DNI}/archivo.pdf del backup local
 */

interface DocumentMetadata {
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  lastModified: Date;
  isAccessible: boolean;
}

// Función para determinar el tipo de contenido basado en la extensión
function getContentType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.txt': 'text/plain',
    '.rtf': 'application/rtf'
  };

  return contentTypes[ext] || 'application/octet-stream';
}

// Función para sanitizar nombres de archivos
function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { dni: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const dni = params.dni;
    const fileName = searchParams.get('file');
    const download = searchParams.get('download') === 'true';

    if (!dni) {
      return NextResponse.json({
        success: false,
        error: 'DNI is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Obtener el path base de documentos desde variables de entorno
    const documentsBasePath = process.env.DOCUMENTS_PATH ||
      'B:/concursos_situacion_post_gracia/descarga_administracion_20250814_191745/documentos';

    console.log(`📄 Fetching documents for DNI: ${dni}, fileName: ${fileName || 'all'}`);

    // Construir path del directorio del usuario
    const userDocumentsPath = join(documentsBasePath, dni);

    // Verificar que el directorio del usuario existe
    if (!existsSync(userDocumentsPath)) {
      return NextResponse.json({
        success: false,
        error: 'No documents directory found for this DNI',
        details: `Path not found: ${userDocumentsPath}`,
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Si no se especifica un archivo, listar todos los documentos
    if (!fileName) {
      try {
        const files = await readdir(userDocumentsPath);
        const documentsMetadata: DocumentMetadata[] = [];

        for (const file of files) {
          try {
            const filePath = join(userDocumentsPath, file);
            const stats = await stat(filePath);

            if (stats.isFile()) {
              documentsMetadata.push({
                fileName: file,
                filePath: filePath,
                fileSize: stats.size,
                contentType: getContentType(file),
                lastModified: stats.mtime,
                isAccessible: true
              });
            }
          } catch (fileError) {
            console.warn(`Error reading file ${file}:`, fileError);
            documentsMetadata.push({
              fileName: file,
              filePath: join(userDocumentsPath, file),
              fileSize: 0,
              contentType: 'application/octet-stream',
              lastModified: new Date(),
              isAccessible: false
            });
          }
        }

        console.log(`📊 Found ${documentsMetadata.length} documents for DNI ${dni}`);

        return NextResponse.json({
          success: true,
          data: {
            dni,
            documentsPath: userDocumentsPath,
            documents: documentsMetadata,
            totalDocuments: documentsMetadata.length,
            accessibleDocuments: documentsMetadata.filter(d => d.isAccessible).length
          },
          timestamp: new Date().toISOString()
        });

      } catch (dirError) {
        console.error('Error reading documents directory:', dirError);
        return NextResponse.json({
          success: false,
          error: 'Error reading documents directory',
          details: dirError instanceof Error ? dirError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }
    }

    // Si se especifica un archivo, servirlo directamente
    const requestedFilePath = join(userDocumentsPath, fileName);

    // Validación de seguridad: asegurar que el archivo está dentro del directorio del usuario
    if (!requestedFilePath.startsWith(userDocumentsPath)) {
      return NextResponse.json({
        success: false,
        error: 'Access denied: Invalid file path',
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    // Verificar que el archivo existe
    if (!existsSync(requestedFilePath)) {
      return NextResponse.json({
        success: false,
        error: 'Document not found',
        details: `File not found: ${fileName}`,
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    try {
      // Leer el archivo
      const fileBuffer = await readFile(requestedFilePath);
      const stats = await stat(requestedFilePath);
      const contentType = getContentType(fileName);

      // Preparar headers
      const headers = new Headers();
      headers.set('Content-Type', contentType);
      headers.set('Content-Length', stats.size.toString());
      headers.set('Last-Modified', stats.mtime.toUTCString());
      headers.set('X-Document-DNI', dni);
      headers.set('X-Document-Name', fileName);

      if (download) {
        // Para descarga
        headers.set('Content-Disposition', `attachment; filename="${sanitizeFileName(fileName)}"`);
      } else {
        // Para visualización en línea (especialmente PDFs)
        if (contentType === 'application/pdf') {
          headers.set('Content-Disposition', `inline; filename="${sanitizeFileName(fileName)}"`);
        }
      }

      console.log(`📄 Serving document: ${fileName} (${stats.size} bytes, ${contentType})`);

      return new NextResponse(new Blob([new Uint8Array(fileBuffer)]), {
        status: 200,
        headers
      });

    } catch (fileError) {
      console.error('Error reading requested file:', fileError);
      return NextResponse.json({
        success: false,
        error: 'Error reading document file',
        details: fileError instanceof Error ? fileError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Documents API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to process document request',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
