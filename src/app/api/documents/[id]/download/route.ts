import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`📥 Downloading document with ID: ${id}`);

    // First, get all users to find which user owns this document
    const usersResponse = await backendClient.getUsers({ size: 1000 });
    
    if (!usersResponse.success || !usersResponse.data?.content?.length) {
      return NextResponse.json(
        { error: 'Failed to fetch users from backend' },
        { status: 500 }
      );
    }

    let document: any = null;
    let documentOwnerUser: any = null;

    // Search through all users to find the document
    for (const user of usersResponse.data.content) {
      try {
        const userDocumentsResponse = await backendClient.getDocuments({
          usuarioId: user.id,
          size: 100
        });
        
        if (userDocumentsResponse.success && userDocumentsResponse.data?.content) {
          const foundDoc = userDocumentsResponse.data.content.find((doc: any) => doc.id === id);
          if (foundDoc) {
            document = foundDoc;
            documentOwnerUser = user;
            console.log(`📄 Found document ${id} belonging to user ${user.fullName || user.name} (${user.id})`);
            break;
          }
        }
      } catch (error) {
        console.warn(`Error checking documents for user ${user.id}:`, error);
        continue;
      }
    }
    
    if (!document) {
      console.log(`❌ Document with ID ${id} not found across all users`);
      return NextResponse.json({
        error: 'Document not found',
        message: 'Document not found in any user\'s document collection',
        searchedId: id
      }, { status: 404 });
    }

    // Get file details
    const fileName = document.fileName || document.nombreArchivo;
    const originalName = document.originalName || document.nombreOriginal || fileName;
    const filePath = document.filePath || document.rutaArchivo;
    const mimeType = document.contentType || document.tipoContenido || 'application/pdf';

    if (!fileName || !filePath) {
      return NextResponse.json(
        { error: 'Document file information not available' },
        { status: 404 }
      );
    }

    // Try to read the file from various possible locations
    const possiblePaths = [
      // Local development path with real documents
      path.join(process.env.LOCAL_DOCUMENTS_PATH || 'B:\\concursos_situacion_post_gracia\\descarga_administracion_20250814_191745\\documentos', filePath),
      // Production Docker volume path
      path.join(process.env.DOCUMENT_STORAGE_PATH || '/var/lib/docker/volumes/mpd_concursos_document_storage_prod/_data', filePath),
      // Alternative paths
      path.join(process.cwd(), 'storage', 'documents', filePath),
      path.join('/app/storage/documents', filePath),
      // Direct path if already absolute
      filePath
    ];

    let fileBuffer: Buffer | null = null;
    let actualFilePath = '';

    for (const fullPath of possiblePaths) {
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isFile()) {
          fileBuffer = await fs.readFile(fullPath);
          actualFilePath = fullPath;
          console.log(`✅ File found at: ${actualFilePath}`);
          break;
        }
      } catch (err) {
        // Continue to next path
        continue;
      }
    }

    if (!fileBuffer) {
      console.error(`❌ File not found in any of the expected locations for document ${id}`);
      console.error('Tried paths:', possiblePaths);
      
      return NextResponse.json({
        error: 'Document file not found',
        message: 'The document exists in the database but the file could not be accessed',
        document: {
          id,
          fileName,
          filePath,
          possiblePaths
        },
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Set appropriate headers for file download
    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    headers.set('Content-Length', fileBuffer.length.toString());
    headers.set('Content-Disposition', `attachment; filename="${originalName}"`);
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('❌ Error downloading document:', error);
    return NextResponse.json(
      {
        error: 'Failed to download document',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
