import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';
import fs from 'fs/promises';
import path from 'path';

const DOCUMENT_BASE_PATHS = [
  process.env.DOCUMENTS_PATH || '/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/documents',
  process.env.LEGACY_DOCUMENTS_PATH || '/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/recovered_documents',
  process.env.BACKUP_DOCUMENTS_PATH || '/var/lib/docker/volumes/mpd_concursos_backup_data_prod/_data'
];

interface OrphanedDocument {
  documentId: string;
  fileName: string;
  filePath: string;
  userDni: string;
  userName: string;
  documentType: string;
  uploadDate: string;
  searchAttempted: string[];
  found: boolean;
}

interface DiagnosticSummary {
  totalUsers: number;
  totalDocuments: number;
  orphanedDocuments: number;
  affectedUsers: number;
  searchPaths: string[];
  orphanedList: OrphanedDocument[];
  timestamp: string;
}

async function checkFileExists(documentId: string, userDni: string): Promise<{ found: boolean; searchAttempted: string[] }> {
  const searchAttempted: string[] = [];
  
  for (const basePath of DOCUMENT_BASE_PATHS) {
    try {
      const userDir = path.join(basePath, userDni);
      searchAttempted.push(userDir);
      
      // Verificar si el directorio existe
      await fs.access(userDir);
      
      // Buscar archivos que comiencen con el document ID
      const files = await fs.readdir(userDir);
      const matchingFile = files.find(file => file.startsWith(documentId));
      
      if (matchingFile) {
        const filePath = path.join(userDir, matchingFile);
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          return { found: true, searchAttempted };
        }
      }
    } catch (error) {
      // El directorio no existe o no se puede acceder, continuar con la siguiente ubicación
      continue;
    }
  }
  
  return { found: false, searchAttempted };
}

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [DIAGNOSTICS] Starting orphaned documents diagnostic`);
    console.log(`⏰ [DIAGNOSTICS] Timestamp: ${new Date().toISOString()}`);
    console.log(`📁 [DIAGNOSTICS] Search paths: ${JSON.stringify(DOCUMENT_BASE_PATHS)}`);

    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 100;

    // Obtener todos los usuarios
    console.log(`👥 [DIAGNOSTICS] Fetching users from backend...`);
    const usersResponse = await backendClient.getUsers({ size: 1000 });
    
    if (!usersResponse.success || !usersResponse.data?.content) {
      return NextResponse.json(
        { error: 'Failed to fetch users from backend' },
        { status: 500 }
      );
    }

    const users = usersResponse.data.content;
    console.log(`👥 [DIAGNOSTICS] Found ${users.length} users`);

    const orphanedDocuments: OrphanedDocument[] = [];
    const affectedUserDnis = new Set<string>();
    let totalDocuments = 0;

    // Verificar documentos para cada usuario
    for (const user of users.slice(0, limit)) {
      try {
        console.log(`👤 [DIAGNOSTICS] Checking user: ${user.fullName || user.name} (DNI: ${user.dni})`);
        
        const userDocumentsResponse = await backendClient.getDocuments({
          usuarioId: user.id,
          size: 100
        });

        if (userDocumentsResponse.success && userDocumentsResponse.data?.content) {
          const documents = userDocumentsResponse.data.content;
          totalDocuments += documents.length;
          
          console.log(`📄 [DIAGNOSTICS] User has ${documents.length} documents in database`);

          for (const document of documents) {
            const { found, searchAttempted } = await checkFileExists(document.id, user.dni);
            
            if (!found) {
              console.log(`❌ [DIAGNOSTICS] ORPHANED: Document ${document.id} not found physically`);
              
              orphanedDocuments.push({
                documentId: document.id,
                fileName: document.fileName || document.nombreArchivo || 'Unknown',
                filePath: document.filePath || document.rutaArchivo || `${user.dni}/${document.fileName || 'unknown'}`,
                userDni: user.dni,
                userName: user.fullName || user.name,
                documentType: document.documentType || document.tipoDocumento || 'Unknown',
                uploadDate: document.uploadDate || document.fechaCarga || 'Unknown',
                searchAttempted,
                found: false
              });
              
              affectedUserDnis.add(user.dni);
            } else {
              console.log(`✅ [DIAGNOSTICS] Document ${document.id} found physically`);
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ [DIAGNOSTICS] Error checking user ${user.dni}:`, error);
        continue;
      }
    }

    const summary: DiagnosticSummary = {
      totalUsers: Math.min(users.length, limit),
      totalDocuments,
      orphanedDocuments: orphanedDocuments.length,
      affectedUsers: affectedUserDnis.size,
      searchPaths: DOCUMENT_BASE_PATHS,
      orphanedList: orphanedDocuments,
      timestamp: new Date().toISOString()
    };

    console.log(`📊 [DIAGNOSTICS] Summary: ${orphanedDocuments.length} orphaned documents found across ${affectedUserDnis.size} users`);

    return NextResponse.json(summary, { status: 200 });

  } catch (error) {
    console.error('❌ [DIAGNOSTICS] Error during diagnostic:', error);
    return NextResponse.json(
      {
        error: 'Failed to run diagnostics',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
