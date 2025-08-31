// src/app/api/documents/direct-download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Endpoint de descarga directa que accede al storage local
 * Usado cuando el backend Spring Boot no puede acceder a los archivos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!documentId || !userId) {
      return NextResponse.json(
        { error: 'Document ID and User ID are required' },
        { status: 400 }
      );
    }

    console.log('📥 [DirectDownload] Acceso directo a storage para documento:', documentId, 'usuario:', userId);

    // Construir path del storage basado en la estructura real
    const storageBasePath = '/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/documents';
    const userDir = path.join(storageBasePath, userId);
    
    try {
      // Listar archivos del usuario para encontrar el que corresponde al documentId
      const files = await fs.readdir(userDir);
      const targetFile = files.find(file => file.startsWith(documentId));
      
      if (!targetFile) {
        console.log('❌ [DirectDownload] Archivo no encontrado para documento:', documentId);
        return NextResponse.json(
          { error: 'Archivo físico no encontrado en storage' },
          { status: 404 }
        );
      }

      const filePath = path.join(userDir, targetFile);
      console.log('📄 [DirectDownload] Archivo encontrado:', filePath);

      // Leer el archivo
      const fileBuffer = await fs.readFile(filePath);
      const stats = await fs.stat(filePath);
      
      // Extraer nombre original del archivo
      const originalName = targetFile.split('_').slice(1, -1).join('_').replace(/_/g, ' ') + '.pdf';
      
      console.log(`✅ [DirectDownload] Sirviendo archivo: ${originalName} (${stats.size} bytes)`);

      // Determinar tipo MIME
      const mimeType = targetFile.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';

      // Crear respuesta con el archivo
      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${originalName}"`,
          'Content-Length': stats.size.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Download-Method': 'direct-storage'
        }
      });

    } catch (fileError) {
      console.error('❌ [DirectDownload] Error accediendo al archivo:', fileError);
      return NextResponse.json(
        { error: 'Error accediendo al sistema de archivos' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [DirectDownload] Error en endpoint:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
