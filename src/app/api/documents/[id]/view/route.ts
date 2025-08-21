import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';
import fs from 'fs/promises';
import path from 'path';

const DOCUMENT_BASE_PATHS = [
  process.env.DOCUMENTS_PATH || '/data/documents',
  process.env.LEGACY_DOCUMENTS_PATH || '/data/legacy',
  process.env.BACKUP_DOCUMENTS_PATH || '/data/backups'
];


async function getAvailableFiles(userDni: string | undefined, basePaths: string[]): Promise<string[]> {
  if (!userDni) return [];

  for (const basePath of basePaths) {
    const userDir = path.join(basePath, userDni);
    try {
      const files = await fs.readdir(userDir);
      return files;
    } catch (err) {
      continue;
    }
  }
  return [];
}

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

    // Initialize document search variables
    let document: any = null;
    let documentOwnerUser: any = null;
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
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn(`⚠️ [DOCUMENT_VIEW] Error checking documents for user ${user.id} (${user.fullName || user.name}):`, errorMessage);
          continue;
        }
      }
    }

    // Initialize document info
    // Search through document paths for the requested file

    // Get empty document info for error reporting
    const emptyDocInfo = {
      fileName: '',
      filePath: '',
      mimeType: 'application/octet-stream'
    };

    if (!document) {
      console.error(`❌ [DOCUMENT_VIEW] Document with ID ${id} not found across all users`);
      console.error(`🔍 [DOCUMENT_VIEW] Search completed across all available users`);
      console.error(`⏰ [DOCUMENT_VIEW] Search duration: ${Date.now() - Date.parse(new Date().toISOString())}ms`);
      return NextResponse.json({
        error: 'Document file not found',
        message: 'The document exists in the database but the file could not be accessed',
        suggestions: [
          'The file may have been moved or deleted',
          'Check if the document was uploaded correctly',
          'Verify storage system integrity'
        ],
        document: {
          id,
          ...emptyDocInfo,
          documentType: null,
          uploadDate: null,
          validationStatus: null,
          searchPaths: DOCUMENT_BASE_PATHS,
          userDni: documentOwnerUser?.dni || documentOwnerUser?.username
        },
        availableFiles: await getAvailableFiles(documentOwnerUser?.dni || documentOwnerUser?.username, DOCUMENT_BASE_PATHS),
        timestamp: new Date().toISOString()
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

    // Get document information
    const { fileName, filePath, mimeType } = getDocumentInfo(document, documentOwnerUser);

    // Log file resolution details
    if (!filePath && fileName) {
      const userDni = documentOwnerUser?.dni || documentOwnerUser?.username;
      console.log(`🔧 [DOCUMENT_VIEW] Constructed filePath from DNI and fileName: ${userDni}/${fileName}`);
      console.log(`📝 [DOCUMENT_VIEW] Construction details: DNI=${userDni}, fileName=${fileName}`);
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
    const searchPaths = DOCUMENT_BASE_PATHS;

    // Build possible file patterns - files might have UUID prefixes
    const possibleFilePatterns = [
      filePath,                                    // Direct path as constructed
      `${id}_*`,                                   // UUID prefix pattern
      `${id}_${fileName.replace(/\s+/g, '_')}*`,   // UUID + sanitized filename
      `${id}*`                                     // UUID with any suffix
    ];

    let fileBuffer: Buffer | null = null;
    let actualFilePath = '';

    // Try each search path
    for (const basePath of searchPaths) {
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
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          console.log(`⚠️ Could not read directory ${userDir}:`, errorMessage);
          continue;
        }
      }
    }


    // Enhanced file search with more flexible patterns
    console.log(`🔍 [ENHANCED_SEARCH] Starting enhanced file search for document ${id}`);

    // Try to find any file that might match this document
    for (const basePath of searchPaths) {
      const userDni = documentOwnerUser?.dni || documentOwnerUser?.username;
      if (userDni) {
        const userDir = path.join(basePath, userDni);
        try {
          const files = await fs.readdir(userDir);
          console.log(`📁 [ENHANCED_SEARCH] Files in ${userDir}:`, files);

          // Try different matching strategies
          let matchingFile = null;

          // Strategy 1: Exact ID match (UUID prefix)
          matchingFile = files.find(file => file.startsWith(id));

          // Strategy 2: If no exact match, try to find files with similar document type
          if (!matchingFile && document.documentType) {
            const docTypeKeywords = document.documentType.toLowerCase()
              .replace(/[^a-z\s]/g, '')
              .split(/\s+/)
              .filter((word: string) => word.length > 2);

            console.log(`🔍 [ENHANCED_SEARCH] Searching by document type keywords:`, docTypeKeywords);

            matchingFile = files.find(file => {
              const fileName = file.toLowerCase();
              return docTypeKeywords.some((keyword: string) =>
                fileName.includes(keyword) ||
                fileName.includes(keyword.replace(/ñ/g, 'n')) ||
                fileName.includes(keyword.replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u'))
              );
            });

            if (matchingFile) {
              console.log(`🎯 [ENHANCED_SEARCH] Found potential match by document type: ${matchingFile}`);
            }
          }

          // Strategy 3: If still no match, try date-based matching
          if (!matchingFile && document.uploadDate) {
            const uploadDate = new Date(document.uploadDate);
            const dateStr = uploadDate.toISOString().split('T')[0].replace(/-/g, '');

            matchingFile = files.find(file => file.includes(dateStr));

            if (matchingFile) {
              console.log(`📅 [ENHANCED_SEARCH] Found potential match by date: ${matchingFile}`);
            }
          }

          if (matchingFile) {
            const matchedPath = path.join(userDir, matchingFile);
            const stats = await fs.stat(matchedPath);
            if (stats.isFile()) {
              fileBuffer = await fs.readFile(matchedPath);
              actualFilePath = matchedPath;
              console.log(`✅ [ENHANCED_SEARCH] Enhanced search found file at: ${actualFilePath}`);
              break;
            }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          console.log(`⚠️ [ENHANCED_SEARCH] Could not read directory ${userDir}:`, errorMessage);
          continue;
        }
      }
    }

    if (!fileBuffer) {
      console.error(`❌ File not found in any of the expected locations for document ${id}`);
      console.error('Tried search paths:', DOCUMENT_BASE_PATHS);
      console.error('Document owner DNI:', documentOwnerUser?.dni || documentOwnerUser?.username);

      const { fileName, filePath } = getDocumentInfo(document, documentOwnerUser);
      return NextResponse.json({
        error: 'Document file not found',
        message: 'The document exists in the database but the file could not be accessed',
        document: {
          id,
          fileName,
          filePath,
          searchPaths: DOCUMENT_BASE_PATHS,
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

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(fileBuffer);

    return new NextResponse(uint8Array, {
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
