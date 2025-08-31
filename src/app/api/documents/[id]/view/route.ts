import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';
import fs from 'fs/promises';
import path from 'path';
import { DocumentSimilarityMatcher } from '@/lib/documents/similarity-matcher';
import { DocumentPlaceholderGenerator, DocumentPlaceholderInfo } from '@/lib/documents/placeholder-generator';
import { DocumentRecoveryLogger, DocumentRecoveryEvent } from '@/lib/audit/document-recovery-logger';

const DOCUMENT_BASE_PATHS = [
  process.env.DOCUMENTS_PATH || '/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/documents',
  process.env.LEGACY_DOCUMENTS_PATH || '/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/recovered_documents',
  process.env.BACKUP_DOCUMENTS_PATH || '/var/lib/docker/volumes/mpd_concursos_backup_data_prod/_data'
];

interface DocumentInfo {
  fileName: string;
  filePath: string;
  mimeType: string;
}

function getDocumentInfo(document: any, documentOwnerUser: any): DocumentInfo {
  const fileName = document.fileName || document.nombreArchivo;
  let filePath = document.filePath || document.rutaArchivo || document.path || document.archivo;
  const mimeType = document.contentType || document.tipoContenido || 'application/pdf';

  // If no filePath is available, try to construct it from other fields
  if (!filePath && fileName) {
    const userDni = documentOwnerUser?.dni || documentOwnerUser?.username;
    if (userDni) {
      filePath = `${userDni}/${fileName}`;
    }
  }

  return { fileName, filePath, mimeType };
}

function getDocumentTypeInfo(document: any) {
  // Intentar obtener información del tipo de documento
  const documentType = document.documentType || document.tipoDocumento;
  
  if (typeof documentType === 'object' && documentType !== null) {
    return {
      code: documentType.code || 'UNKNOWN',
      nombre: documentType.nombre || documentType.name || 'Documento Desconocido',
      descripcion: documentType.descripcion || documentType.description
    };
  }
  
  // Si documentType es string, usar como nombre
  if (typeof documentType === 'string') {
    return {
      code: documentType.replace(/\s+/g, '_').toUpperCase(),
      nombre: documentType,
      descripcion: undefined
    };
  }
  
  // Fallback: usar el nombre del archivo para determinar el tipo
  const fileName = document.fileName || document.nombreArchivo || 'unknown';
  return {
    code: 'UNKNOWN',
    nombre: fileName.replace(/\.pdf$/i, '').replace(/^[a-f0-9-]+_/i, '').replace(/_\d+$/, ''),
    descripcion: 'Tipo de documento no especificado'
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const referer = request.headers.get('referer');

    console.log(`🔍 [DOCUMENT_VIEW_V2] Starting enhanced document view request`);
    console.log(`📋 [DOCUMENT_VIEW_V2] Document ID: ${id}`);
    console.log(`🔗 [DOCUMENT_VIEW_V2] Referer: ${referer}`);
    console.log(`🌐 [DOCUMENT_VIEW_V2] Request URL: ${request.url}`);
    console.log(`📁 [DOCUMENT_VIEW_V2] Search paths: ${JSON.stringify(DOCUMENT_BASE_PATHS)}`);
    console.log(`⏰ [DOCUMENT_VIEW_V2] Timestamp: ${new Date().toISOString()}`);

    // Initialize document search variables
    let document: any = null;
    let documentOwnerUser: any = null;
    let targetDni: string | null = null;

    // Extract DNI from referer if available
    if (referer) {
      const refererMatch = referer.match(/\/postulations\/(\d+)\/documents/);
      if (refererMatch) {
        targetDni = refererMatch[1];
        console.log(`🎯 [DOCUMENT_VIEW_V2] Extracted DNI from referer: ${targetDni}`);
      }
    }

    // Search for the document in the database
    if (targetDni) {
      // Search for specific user first
      const usersResponse = await backendClient.getUsers({ size: 1000 });

      if (usersResponse.success && usersResponse.data?.content?.length) {
        const targetUser = usersResponse.data.content.find((u: any) =>
          (u.dni === targetDni) || (u.username === targetDni)
        );

        if (targetUser) {
          const userDocumentsResponse = await backendClient.getDocuments({
            usuario: targetUser.id,
            size: 100
          });

          if (userDocumentsResponse.success && userDocumentsResponse.data?.content) {
            const foundDoc = userDocumentsResponse.data.content.find((doc: any) => doc.id === id);
            if (foundDoc) {
              document = foundDoc;
              documentOwnerUser = targetUser;
              console.log(`📄 [DOCUMENT_VIEW_V2] ✅ Found document ${id} in target user ${targetUser.fullName || targetUser.name} (${targetUser.dni})`);
            }
          }
        }
      }
    }

    // If not found in target user, fall back to searching all users
    if (!document) {
      console.log(`🔄 [DOCUMENT_VIEW_V2] Document not found in target user, falling back to search all users`);
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
            usuario: user.id,
            size: 100
          });

          if (userDocumentsResponse.success && userDocumentsResponse.data?.content) {
            const foundDoc = userDocumentsResponse.data.content.find((doc: any) => doc.id === id);
            if (foundDoc) {
              document = foundDoc;
              documentOwnerUser = user;
              console.log(`📄 [DOCUMENT_VIEW_V2] ✅ Found document ${id} belonging to user ${user.fullName || user.name} (DNI: ${user.dni || 'N/A'})`);
              break;
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn(`⚠️ [DOCUMENT_VIEW_V2] Error checking documents for user ${user.id}:`, errorMessage);
          continue;
        }
      }
    }

    if (!document) {
      console.error(`❌ [DOCUMENT_VIEW_V2] Document with ID ${id} not found in database`);
      return NextResponse.json({
        error: 'Document not found in database',
        documentId: id,
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    console.log(`📄 [DOCUMENT_VIEW_V2] ✅ Document found in database`);
    console.log(`👤 [DOCUMENT_VIEW_V2] Document owner: ${documentOwnerUser?.fullName || documentOwnerUser?.name} (DNI: ${documentOwnerUser?.dni})`);

    // Get document information
    const { fileName, filePath, mimeType } = getDocumentInfo(document, documentOwnerUser);
    const documentTypeInfo = getDocumentTypeInfo(document);

    console.log(`📁 [DOCUMENT_VIEW_V2] File resolution details:`);
    console.log(`   - File Name: ${fileName}`);
    console.log(`   - File Path: ${filePath}`);
    console.log(`   - MIME Type: ${mimeType}`);
    console.log(`   - Document Type: ${documentTypeInfo.nombre}`);

    if (!fileName || !filePath) {
      return NextResponse.json({
        error: 'Document file information not available',
        message: 'Missing fileName or filePath in document metadata',
        documentInfo: { fileName, filePath, availableFields: Object.keys(document) }
      }, { status: 404 });
    }

    // **NUEVA LÓGICA DE RECUPERACIÓN AUTOMÁTICA**
    
    const userDni = documentOwnerUser?.dni || documentOwnerUser?.username;
    if (!userDni) {
      return NextResponse.json({
        error: 'User DNI not available',
        message: 'Cannot perform file search without user DNI'
      }, { status: 400 });
    }

    // Usar el matcher de similitud para buscar el archivo
    const searchResult = await DocumentSimilarityMatcher.searchSimilarDocuments(
      userDni,
      documentTypeInfo.nombre,
      id,
      DOCUMENT_BASE_PATHS
    );

    // Preparar información para logging y placeholder
    const recoveryEvent: DocumentRecoveryEvent = {
      timestamp: new Date().toISOString(),
      documentId: id,
      userDni: userDni,
      userName: documentOwnerUser?.fullName || documentOwnerUser?.name,
      expectedFileName: fileName,
      expectedDocumentType: documentTypeInfo.nombre,
      searchPaths: searchResult.searchAttempted,
      recoveryType: 'NOT_FOUND', // Se actualizará según el resultado
      similarDocumentsFound: searchResult.similarDocuments.length,
      sessionId: request.headers.get('x-session-id') || undefined,
      adminUser: request.headers.get('x-admin-user') || undefined
    };

    // CASO 1: Archivo exacto encontrado
    if (searchResult.exactMatch) {
      console.log(`✅ [DOCUMENT_VIEW_V2] Exact match found: ${searchResult.exactMatch.fileName}`);
      
      recoveryEvent.recoveryType = 'EXACT_MATCH';
      recoveryEvent.recoveredDocument = {
        id: searchResult.exactMatch.id,
        fileName: searchResult.exactMatch.fileName,
        fullPath: searchResult.exactMatch.fullPath,
        documentType: searchResult.exactMatch.documentType
      };

      // Log del evento
      await DocumentRecoveryLogger.logRecoveryEvent(recoveryEvent);

      // Servir el archivo encontrado
      try {
        const fileBuffer = await fs.readFile(searchResult.exactMatch.fullPath);
        
        const headers = new Headers();
        headers.set('Content-Type', mimeType);
        headers.set('Content-Length', fileBuffer.length.toString());
        headers.set('Content-Disposition', `inline; filename="${fileName}"`);
        headers.set('Cache-Control', 'public, max-age=3600');

        const uint8Array = new Uint8Array(fileBuffer);

        console.log(`✅ [DOCUMENT_VIEW_V2] Successfully serving exact match: ${searchResult.exactMatch.fullPath}`);
        
        return new NextResponse(uint8Array, { status: 200, headers });

      } catch (fileError) {
        console.error(`❌ [DOCUMENT_VIEW_V2] Error reading exact match file:`, fileError);
      }
    }

    // CASO 2: Recuperación automática por similitud
    const bestCandidate = DocumentSimilarityMatcher.getBestRecoveryCandidate(searchResult.similarDocuments);
    
    if (bestCandidate) {
      console.log(`🔄 [DOCUMENT_VIEW_V2] Auto-recovery candidate found: ${bestCandidate.fileName}`);
      
      recoveryEvent.recoveryType = 'RECOVERED_BY_SIMILARITY';
      recoveryEvent.recoveredDocument = {
        id: bestCandidate.id,
        fileName: bestCandidate.fileName,
        fullPath: bestCandidate.fullPath,
        documentType: bestCandidate.documentType
      };

      // Log del evento
      await DocumentRecoveryLogger.logRecoveryEvent(recoveryEvent);

      // Intentar servir el archivo recuperado
      try {
        const fileBuffer = await fs.readFile(bestCandidate.fullPath);
        
        const headers = new Headers();
        headers.set('Content-Type', mimeType);
        headers.set('Content-Length', fileBuffer.length.toString());
        headers.set('Content-Disposition', `inline; filename="${fileName}"`);
        headers.set('Cache-Control', 'public, max-age=1800'); // Cache más corto para recuperados
        headers.set('X-Document-Recovery', 'SIMILARITY_MATCH');
        headers.set('X-Original-Document-Id', id);
        headers.set('X-Recovered-Document-Id', bestCandidate.id);
        headers.set('X-Recovery-Warning', 'Document recovered by similarity matching');

        const uint8Array = new Uint8Array(fileBuffer);

        console.log(`🔄 [DOCUMENT_VIEW_V2] Successfully serving recovered document: ${bestCandidate.fullPath}`);
        
        return new NextResponse(uint8Array, { status: 200, headers });

      } catch (fileError) {
        console.error(`❌ [DOCUMENT_VIEW_V2] Error reading recovered file:`, fileError);
      }
    }

    // CASO 3: Archivo no encontrado - Generar placeholder PDF
    console.error(`❌ [DOCUMENT_VIEW_V2] File not found, generating placeholder PDF`);
    
    recoveryEvent.recoveryType = 'PLACEHOLDER_GENERATED';
    
    // Log del evento
    await DocumentRecoveryLogger.logRecoveryEvent(recoveryEvent);

    // Generar información para el placeholder
    const placeholderInfo: DocumentPlaceholderInfo = {
      documentId: id,
      fileName: fileName,
      expectedPath: filePath,
      userDni: userDni,
      userName: documentOwnerUser?.fullName || documentOwnerUser?.name,
      documentType: documentTypeInfo,
      uploadDate: document.uploadDate || document.fechaCarga,
      searchAttempted: searchResult.searchAttempted,
      similarDocuments: searchResult.similarDocuments.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        path: doc.fullPath
      })),
      recoveryType: bestCandidate ? 'RECOVERED_BY_SIMILARITY' : 'NOT_FOUND',
      recoveredDocument: bestCandidate ? {
        id: bestCandidate.id,
        fileName: bestCandidate.fileName,
        path: bestCandidate.fullPath
      } : undefined
    };

    // Generar PDF placeholder
    const placeholderPDF = await DocumentPlaceholderGenerator.generatePlaceholderPDF(placeholderInfo);

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Length', placeholderPDF.length.toString());
    headers.set('Content-Disposition', `inline; filename="DOCUMENTO_NO_ENCONTRADO_${id}.pdf"`);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('X-Document-Status', 'PLACEHOLDER');
    headers.set('X-Original-Document-Id', id);
    headers.set('X-Recovery-Type', placeholderInfo.recoveryType);
    
    if (bestCandidate) {
      headers.set('X-Recovered-Document-Id', bestCandidate.id);
    }

    const uint8Array = new Uint8Array(placeholderPDF);

    const processingTime = Date.now() - startTime;
    console.log(`📋 [DOCUMENT_VIEW_V2] Placeholder PDF generated successfully in ${processingTime}ms`);

    return new NextResponse(uint8Array, { status: 200, headers });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [DOCUMENT_VIEW_V2] Error viewing document (${processingTime}ms):`, error);
    
    return NextResponse.json(
      {
        error: 'Failed to view document',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        processingTime: processingTime
      },
      { status: 500 }
    );
  }
}
