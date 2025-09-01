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
    console.log(`📥 [DOCUMENT_DOWNLOAD] Starting document download request`);
    console.log(`📋 [DOCUMENT_DOWNLOAD] Document ID: ${id}`);
    console.log(`🌐 [DOCUMENT_DOWNLOAD] Request URL: ${request.url}`);
    console.log(`⏰ [DOCUMENT_DOWNLOAD] Timestamp: ${new Date().toISOString()}`);

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
          usuario: user.id,
          size: 100
        });

        if (userDocumentsResponse.success && userDocumentsResponse.data?.content) {
          const foundDoc = userDocumentsResponse.data.content.find((doc: any) => doc.id === id);
          if (foundDoc) {
            document = foundDoc;
            documentOwnerUser = user;
            console.log(`📄 [DOCUMENT_DOWNLOAD] ✅ Found document ${id} belonging to user ${user.fullName || user.name} (DNI: ${user.dni || 'N/A'}, ID: ${user.id})`);
            break;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠️ [DOCUMENT_DOWNLOAD] Error checking documents for user ${user.id} (${user.fullName || user.name}):`, errorMessage);
        continue;
      }
    }

    if (!document) {
      console.error(`❌ [DOCUMENT_DOWNLOAD] Document with ID ${id} not found across all users`);
      console.error(`🔍 [DOCUMENT_DOWNLOAD] Search completed across ${usersResponse.data?.content?.length || 0} users`);
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

    console.log(`📁 [DOCUMENT_DOWNLOAD] File resolution details:`);
    console.log(`   - File Name: ${fileName}`);
    console.log(`   - Original Name: ${originalName}`);
    console.log(`   - File Path: ${filePath}`);
    console.log(`   - MIME Type: ${mimeType}`);

    // Try to read the file from various possible locations
    const possiblePaths = [
      // Local development path with real documents
      path.join(process.env.LOCAL_DOCUMENTS_PATH || 'B:\\concursos_situacion_post_gracia\\descarga_administracion_20250814_191745\\documentos', filePath),
      // Production Docker volume path
      path.join(process.env.DOCUMENT_STORAGE_PATH || '/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/documents', filePath),
      // Alternative paths
      path.join(process.cwd(), 'storage', 'documents', filePath),
      path.join('/app/storage/documents', filePath),
      // Direct path if already absolute
      filePath
    ];

    console.log(`📁 [DOCUMENT_DOWNLOAD] Attempting file access from paths:`);
    possiblePaths.forEach((path, index) => {
      console.log(`   ${index + 1}. ${path}`);
    });

    let fileBuffer: Buffer | null = null;
    let actualFilePath = '';

    for (const fullPath of possiblePaths) {
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isFile()) {
          fileBuffer = await fs.readFile(fullPath);
          actualFilePath = fullPath;
          console.log(`✅ [DOCUMENT_DOWNLOAD] File found at: ${actualFilePath}`);
          console.log(`📄 [DOCUMENT_DOWNLOAD] File size: ${stats.size} bytes`);
          console.log(`🗺️ [DOCUMENT_DOWNLOAD] File type: ${mimeType}`);
          break;
        }
      } catch (err) {
        // Continue to next path
        continue;
      }
    }

    if (!fileBuffer) {
      console.error(`❌ [DOCUMENT_DOWNLOAD] File not found in any of the expected locations for document ${id}`);
      console.error(`🔍 [DOCUMENT_DOWNLOAD] All attempted paths:`);
      possiblePaths.forEach((path, index) => {
        console.error(`   ${index + 1}. ${path}`);
      });
      console.error(`📊 [DOCUMENT_DOWNLOAD] Environment variables:`);
      console.error(`   - LOCAL_DOCUMENTS_PATH: ${process.env.LOCAL_DOCUMENTS_PATH || 'Not set'}`);
      console.error(`   - DOCUMENT_STORAGE_PATH: ${process.env.DOCUMENT_STORAGE_PATH || 'Not set'}`);
      console.error(`   - Current working directory: ${process.cwd()}`);
      console.error(`⏰ [DOCUMENT_DOWNLOAD] Error timestamp: ${new Date().toISOString()}`);

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

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(fileBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('❌ [DOCUMENT_DOWNLOAD] Fatal error during document download:', error);
    console.error(`🔍 [DOCUMENT_DOWNLOAD] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
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
