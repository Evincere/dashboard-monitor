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
    const url = new URL(request.url);
    const referer = request.headers.get('referer');
    
    console.log(`🔍 [DOCUMENT_VIEW] Starting document view request`);
    console.log(`📋 [DOCUMENT_VIEW] Document ID: ${id}`);
    console.log(`🔗 [DOCUMENT_VIEW] Referer: ${referer}`);
    console.log(`🌐 [DOCUMENT_VIEW] Request URL: ${request.url}`);
    console.log(`⏰ [DOCUMENT_VIEW] Timestamp: ${new Date().toISOString()}`);

    let document: any = null;
    let documentOwnerUser: any = null;

    // Try to extract DNI from referer URL if possible
    let targetDni: string | null = null;
    if (referer) {
      const refererMatch = referer.match(/\/postulations\/(\d+)\/documents/);
      if (refererMatch) {
        targetDni = refererMatch[1];
        console.log(`🎯 [DOCUMENT_VIEW] Extracted DNI from referer: ${targetDni}`);
        console.log(`🔍 [DOCUMENT_VIEW] Will search for user with DNI: ${targetDni} first`);
      }
    }

    if (targetDni) {
      // If we have a DNI, search for that specific user first
      const usersResponse = await backendClient.getUsers({ size: 1000 });
      
      if (usersResponse.success && usersResponse.data?.content?.length) {
        const targetUser = usersResponse.data.content.find((u: any) =>
          (u.dni === targetDni) || (u.username === targetDni)
        );
        
        if (targetUser) {
          const userDocumentsResponse = await backendClient.getDocuments({
            usuarioId: targetUser.id,
            size: 100
          });
          
          if (userDocumentsResponse.success && userDocumentsResponse.data?.content) {
            const foundDoc = userDocumentsResponse.data.content.find((doc: any) => doc.id === id);
            if (foundDoc) {
              document = foundDoc;
              documentOwnerUser = targetUser;
              console.log(`📄 [DOCUMENT_VIEW] ✅ Found document ${id} in target user ${targetUser.fullName || targetUser.name} (${targetUser.dni})`);
              console.log(`📊 [DOCUMENT_VIEW] Document metadata:`, JSON.stringify(foundDoc, null, 2));
            }
          }
        }
      }
    }

    // If not found in target user, fall back to searching all users
    if (!document) {
      console.log(`🔄 [DOCUMENT_VIEW] Document not found in target user, falling back to search all users`);
      console.log(`🔍 [DOCUMENT_VIEW] Searching across all users for document ${id}`);
      const usersResponse = await backendClient.getUsers({ size: 1000 });
      
      if (!usersResponse.success || !usersResponse.data?.content?.length) {
        return NextResponse.json(
          { error: 'Failed to fetch users from backend' },
          { status: 500 }
        );
      }

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
              console.log(`📄 [DOCUMENT_VIEW] ✅ Found document ${id} belonging to user ${user.fullName || user.name} (DNI: ${user.dni || 'N/A'}, ID: ${user.id})`);
              break;
            }
          }
        } catch (error) {
          console.warn(`⚠️ [DOCUMENT_VIEW] Error checking documents for user ${user.id} (${user.fullName || user.name}):`, error.message || error);
          continue;
        }
      }
    }
    
    if (!document) {
      console.error(`❌ [DOCUMENT_VIEW] Document with ID ${id} not found across all users`);
      console.error(`🔍 [DOCUMENT_VIEW] Search completed across ${usersResponse.data?.content?.length || 0} users`);
      console.error(`⏰ [DOCUMENT_VIEW] Search duration: ${Date.now() - Date.parse(new Date().toISOString())}ms`);
      return NextResponse.json({
        error: 'Document not found',
        message: 'Document not found in any user\'s document collection',
        searchedId: id
      }, { status: 404 });
    }

    console.log(`📄 [DOCUMENT_VIEW] ✅ Document found successfully`);
    console.log(`📊 [DOCUMENT_VIEW] Document details:`);
    console.log(`   - ID: ${document.id}`);
    console.log(`   - Type: ${document.documentType || 'Unknown'}`);
    console.log(`   - Size: ${document.fileSize || 'Unknown'}`);
    console.log(`   - Upload Date: ${document.uploadDate || 'Unknown'}`);
    console.log(`   - Validation Status: ${document.validationStatus || 'Unknown'}`);
    console.log(`👤 [DOCUMENT_VIEW] Document owner: ${documentOwnerUser?.fullName || documentOwnerUser?.name} (DNI: ${documentOwnerUser?.dni})`);
    console.log(`📁 [DOCUMENT_VIEW] Full document object:`, JSON.stringify(document, null, 2));
    
    // Get file details - try multiple field variations
    const fileName = document.fileName || document.nombreArchivo;
    let filePath = document.filePath || document.rutaArchivo || document.path || document.archivo;
    const mimeType = document.contentType || document.tipoContenido || 'application/pdf';

    // If no filePath is available, try to construct it from other fields
    if (!filePath && fileName) {
      // Try common patterns based on MPD structure
      const userDni = documentOwnerUser?.dni || documentOwnerUser?.username;
      if (userDni) {
        filePath = `${userDni}/${fileName}`;
        console.log(`🔧 [DOCUMENT_VIEW] Constructed filePath from DNI and fileName: ${filePath}`);
        console.log(`📝 [DOCUMENT_VIEW] Construction details: DNI=${userDni}, fileName=${fileName}`);
      }
    }

    console.log(`📁 [DOCUMENT_VIEW] File resolution details:`);
    console.log(`   - File Name: ${fileName}`);
    console.log(`   - File Path: ${filePath}`);
    console.log(`   - MIME Type: ${mimeType}`);
    console.log(`   - Document Owner DNI: ${documentOwnerUser?.dni || 'N/A'}`);
    console.log(`🔍 [DOCUMENT_VIEW] Document fields available:`, Object.keys(document));
    console.log(`📊 [DOCUMENT_VIEW] Full document metadata:`, JSON.stringify(document, null, 2));

    if (!fileName || !filePath) {
      return NextResponse.json({
        error: 'Document file information not available',
        message: 'Missing fileName or filePath in document metadata',
        documentInfo: {
          fileName,
          filePath,
          availableFields: Object.keys(document),
          document: document
        }
      }, { status: 404 });
    }

    // Try to read the file from various possible locations
    const basePaths = [
      process.env.LOCAL_DOCUMENTS_PATH || 'B:\\concursos_situacion_post_gracia\\descarga_administracion_20250814_191745\\documentos',
      process.env.DOCUMENT_STORAGE_PATH || '/var/lib/docker/volumes/mpd_concursos_document_storage_prod/_data',
      path.join(process.cwd(), 'storage', 'documents'),
      '/app/storage/documents'
    ];
    
    // Build possible file patterns - files might have UUID prefixes
    const possibleFilePatterns = [
      filePath,                                    // Direct path as constructed
      `${id}_*`,                                   // UUID prefix pattern
      `${id}_${fileName.replace(/\s+/g, '_')}*`,   // UUID + sanitized filename
      `${id}*`                                     // UUID with any suffix
    ];

    let fileBuffer: Buffer | null = null;
    let actualFilePath = '';

    // Try each base path
    for (const basePath of basePaths) {
      // Try direct file path first
      const directPath = path.join(basePath, filePath);
      try {
        const stats = await fs.stat(directPath);
        if (stats.isFile()) {
          fileBuffer = await fs.readFile(directPath);
          actualFilePath = directPath;
          console.log(`✅ Direct file found at: ${actualFilePath}`);
          break;
        }
      } catch (err) {
        // Continue to pattern matching
      }
      
      // If direct path fails, try to find files matching the document ID pattern
      const userDni = documentOwnerUser?.dni || documentOwnerUser?.username;
      if (userDni) {
        const userDir = path.join(basePath, userDni);
        try {
          const files = await fs.readdir(userDir);
          console.log(`📁 Files in ${userDir}:`, files);
          
          // Look for files that start with the document ID
          const matchingFile = files.find(file => file.startsWith(id));
          
          if (matchingFile) {
            const matchedPath = path.join(userDir, matchingFile);
            const stats = await fs.stat(matchedPath);
            if (stats.isFile()) {
              fileBuffer = await fs.readFile(matchedPath);
              actualFilePath = matchedPath;
              console.log(`✅ Pattern-matched file found at: ${actualFilePath}`);
              break;
            }
          }
        } catch (err) {
          console.log(`⚠️ Could not read directory ${userDir}:`, err.message);
          continue;
        }
      }
    }

    if (!fileBuffer) {
      console.error(`❌ File not found in any of the expected locations for document ${id}`);
      console.error('Tried base paths:', basePaths);
      console.error('Document owner DNI:', documentOwnerUser?.dni || documentOwnerUser?.username);
      
      return NextResponse.json({
        error: 'Document file not found',
        message: 'The document exists in the database but the file could not be accessed',
        document: {
          id,
          fileName,
          filePath,
          basePaths,
          userDni: documentOwnerUser?.dni || documentOwnerUser?.username
        },
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Set appropriate headers for inline viewing
    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    headers.set('Content-Length', fileBuffer.length.toString());
    
    // For PDFs and images, display inline; for other files, suggest download
    if (mimeType.includes('pdf') || mimeType.includes('image')) {
      headers.set('Content-Disposition', `inline; filename="${fileName}"`);
    } else {
      headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    }

    headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('❌ Error viewing document:', error);
    return NextResponse.json(
      {
        error: 'Failed to view document',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
