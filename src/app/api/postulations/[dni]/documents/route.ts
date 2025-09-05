import { NextRequest, NextResponse } from 'next/server';
import sessionBackendClient from "@/lib/session-backend-client";

import { mapDocumentStatus } from '@/lib/document-status-utils';
import fs from 'fs';
import path from 'path';

/**
 * @fileOverview API para obtener documentos de un postulante específico
 * Combina información del postulante con sus documentos y calcula el estado de validación
 */

interface Document {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  documentType: string;
  validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  isRequired: boolean;
  uploadDate: string;
  validatedAt?: string;
  validatedBy?: string;
  comments?: string;
  rejectionReason?: string;
  thumbnailUrl?: string;
  fileSizeSource?: 'filesystem' | 'backend' | 'none';
  fileSizeError?: string;
}

interface PostulantInfo {
  user: {
    dni: string;
    fullName: string;
    email: string | undefined;
  };
  inscription: {
    id: string;
    state: string;
    centroDeVida: string;
    createdAt: string;
  };
  contest: {
    id: number;
    title: string;
    category: string;
    position: string;
    department: string;
    contestClass: string;
    status: string;
    statusDescription: string;
    inscriptionStartDate: string;
    inscriptionEndDate: string;
    dependency?: string;
    location?: string;
  };
}

interface DocumentsPageData {
  postulant: PostulantInfo;
  documents: Document[];
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    required: number;
    completionPercentage: number;
  };
  validationStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'REJECTED';
}

// Configuration for file storage based on MPD system architecture
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// Storage configuration
const STORAGE_BASE_PATH = process.env.STORAGE_BASE_PATH || '/var/lib/mpd';
const STORAGE_BASE_DIR = process.env.APP_STORAGE_BASE_DIR || (IS_PRODUCTION ? '/app/storage' : './storage');
const DOCUMENTS_DIR = process.env.APP_STORAGE_DOCUMENTS_DIR || 'documents';

// Development and production paths
const PRIMARY_DOCS_PATH = process.env.DOCUMENTS_PATH;
const LOCAL_DOCS_PATH = process.env.LOCAL_DOCUMENTS_PATH || (IS_PRODUCTION
  ? '/opt/mpd/documents'
  : 'B:\\\\concursos_situacion_post_gracia\\\\descarga_administracion_20250814_191745\\\\documentos'
);
const BACKEND_STORAGE_PATH = process.env.DOCUMENT_STORAGE_PATH || (IS_PRODUCTION
  ? "/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/documents"
  : "/var/lib/mpd/documents"
);

// Production-ready path resolution
const getDocumentBasePaths = (): string[] => {
  const paths: string[] = [];

  // 1. Primary path from environment (highest priority)
  if (PRIMARY_DOCS_PATH) {
    paths.push(PRIMARY_DOCS_PATH);
    console.log(`📁 Using primary documents path: ${PRIMARY_DOCS_PATH}`);
  }

  // 2. Production paths
  if (IS_PRODUCTION) {
    paths.push(
      '/app/storage/documents',
      '/var/lib/mpd-documents',
      '/opt/mpd/documents',
      path.join(STORAGE_BASE_PATH, DOCUMENTS_DIR)
    );
  } else {
    // 3. Development paths
    paths.push(
      BACKEND_STORAGE_PATH,    // Backend storage first (most likely to work in dev)
      LOCAL_DOCS_PATH,
      path.join(process.cwd(), 'storage', 'documents'),
      path.join(process.cwd(), 'uploads'),
      path.join(STORAGE_BASE_PATH, DOCUMENTS_DIR)
    );
  }

  // 4. Additional fallbacks for both environments
  paths.push(
    path.join('C:', 'app', 'storage', 'documents'),
    '/tmp/mpd-documents'
  );

  // Remove duplicates and log final paths
  const uniquePaths = [...new Set(paths)];
  console.log(`📁 Document base paths (${NODE_ENV}):`, uniquePaths);

  return uniquePaths;
};

// Tipos de documentos obligatorios - usando nombres reales del sistema
const REQUIRED_DOCUMENT_TYPES = [
  'DNI (Frontal)',
  'DNI (Dorso)',
  'Título Universitario y Certificado Analítico',
  'Certificado de Antecedentes Penales',
  'Certificado Sin Sanciones Disciplinarias',
  'Certificado de Antigüedad Profesional',
  'Constancia de CUIL'
  // Nota: 'Certificado Ley Micaela' es opcional, no requerido para este concurso
];

/**
 * Get file size from filesystem with fuzzy matching by document ID
 * @param filePath - Relative path from database (format: "dni/filename")
 * @param documentId - Document UUID for fuzzy matching
 * @returns File size in bytes or 0 if file doesn't exist
 */
async function getFileSize(filePath: string, documentId?: string): Promise<number> {
  if (!filePath) {
    throw new Error('La ruta del archivo es requerida');
  }

  // Extract DNI from filePath (e.g., "35515608/filename.pdf" -> "35515608")
  const pathParts = filePath.split('/');
  const dni = pathParts[0];
  const fileName = pathParts[pathParts.length - 1];

  if (!dni || !fileName) {
    throw new Error('Formato de ruta inválido. Se espera: DNI/nombrearchivo');
  }

  console.log(`📏 getFileSize: Procesando archivo: DNI=${dni}, Archivo=${fileName}, DocumentId=${documentId}`);

  // Get environment-aware document base paths
  const possibleBasePaths = getDocumentBasePaths();

  // Función auxiliar para verificar el tamaño real del archivo
  async function verifyFileSize(path: string): Promise<number> {
    try {
      const fileHandle = await fs.promises.open(path, 'r');
      try {
        const { size } = await fileHandle.stat();
        console.log(`📏 verifyFileSize: Tamaño del archivo ${path}: ${size} bytes`);
        
        // Verificación adicional del tamaño usando stream (solo para archivos pequeños)
        if (size < 10 * 1024 * 1024) { // Solo para archivos menores a 10MB
          const stream = fileHandle.createReadStream();
          let actualSize = 0;
          
          await new Promise<void>((resolve, reject) => {
            stream.on('data', (chunk: string | Buffer) => {
              actualSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.from(chunk).length;
            });
            stream.on('end', () => resolve());
            stream.on('error', (error: Error) => reject(error));
          });

          if (actualSize !== size) {
            console.warn(`⚠️ Discrepancia en el tamaño del archivo ${path}: stats=${size}, actual=${actualSize}`);
            return actualSize; // Usar el tamaño real contado
          }
        }
        return size;
      } finally {
        await fileHandle.close();
      }
    } catch (error) {
      console.error(`❌ Error al verificar tamaño de archivo ${path}:`, error);
      throw error;
    }
  }

  // 1. Intentar ruta exacta
  console.log(`🔍 getFileSize: Buscando archivo en rutas exactas...`);
  for (const basePath of possibleBasePaths) {
    const exactPath = path.join(basePath, filePath);
    try {
      const stats = await fs.promises.stat(exactPath);
      if (stats.isFile()) {
        console.log(`✅ getFileSize: Archivo encontrado en ruta exacta: ${exactPath}`);
        return await verifyFileSize(exactPath);
      }
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && err.code !== 'ENOENT') {
        console.error(`❌ Error al acceder a ${exactPath}:`, err);
      }
      continue;
    }
  }

  // 2. Búsqueda difusa si tenemos documentId
  if (documentId) {
    console.log(`🔍 getFileSize: Buscando archivo con coincidencia difusa...`);
    for (const basePath of possibleBasePaths) {
      const userDir = path.join(basePath, dni);
      try {
        const files = await fs.promises.readdir(userDir);
        console.log(`📁 getFileSize: Archivos encontrados en ${userDir}: ${files.length} archivos`);
        
        // Buscar coincidencias por documentId y nombre similar
        const matchingFiles = files.filter(file => {
          const normalizedFileName = file.toLowerCase();
          const normalizedTargetFileName = fileName.toLowerCase();
          const normalizedDocumentId = documentId.toLowerCase();
          
          const matches = (
            file.startsWith(documentId) ||
            normalizedFileName.includes(normalizedTargetFileName) ||
            normalizedFileName.includes(normalizedDocumentId) ||
            normalizedTargetFileName.includes(normalizedFileName.replace(/\.[^/.]+$/, ""))
          );
          
          if (matches) {
            console.log(`🎯 getFileSize: Coincidencia encontrada: ${file}`);
          }
          
          return matches;
        });

        if (matchingFiles.length > 0) {
          const bestMatch = matchingFiles[0]; // Tomar la primera coincidencia
          const fullPath = path.join(userDir, bestMatch);
          console.log(`✅ getFileSize: Archivo encontrado por coincidencia difusa: ${fullPath}`);
          return await verifyFileSize(fullPath);
        }
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && err.code !== 'ENOENT') {
          console.error(`❌ Error en búsqueda difusa en ${userDir}:`, err);
        }
        continue;
      }
    }
  }

  // 3. Búsqueda adicional por nombre de archivo sin DNI
  console.log(`🔍 getFileSize: Buscando archivo por nombre sin DNI...`);
  for (const basePath of possibleBasePaths) {
    try {
      // Buscar en subdirectorios que contengan el DNI
      const entries = await fs.promises.readdir(basePath, { withFileTypes: true });
      const dirs = entries.filter(entry => entry.isDirectory() && entry.name.includes(dni));
      
      for (const dir of dirs) {
        const dirPath = path.join(basePath, dir.name);
        try {
          const files = await fs.promises.readdir(dirPath);
          const matchingFiles = files.filter(file => 
            file.toLowerCase().includes(fileName.toLowerCase()) ||
            fileName.toLowerCase().includes(file.replace(/\.[^/.]+$/, "").toLowerCase())
          );
          
          if (matchingFiles.length > 0) {
            const bestMatch = matchingFiles[0];
            const fullPath = path.join(dirPath, bestMatch);
            console.log(`✅ getFileSize: Archivo encontrado en subdirectorio: ${fullPath}`);
            return await verifyFileSize(fullPath);
          }
        } catch (err) {
          continue;
        }
      }
    } catch (err) {
      continue;
    }
  }

  // Si no se encuentra el archivo, lanzar error con información detallada
  const errorMessage = `No se pudo encontrar el archivo: ${filePath}
    - DNI: ${dni}
    - Nombre de archivo: ${fileName}
    - Document ID: ${documentId}
    - Rutas buscadas: ${possibleBasePaths.join(', ')}`;
  
  console.error(`❌ getFileSize: ${errorMessage}`);
  throw new Error(errorMessage);
}

/**
 * Calculate file sizes for documents concurrently
 * @param documents - Array of document objects
 * @returns Array of documents with calculated file sizes
 */
async function calculateFileSizes(documents: Document[]): Promise<Document[]> {
  console.log(`🔧 calculateFileSizes: Procesando ${documents.length} documentos`);

  const results = await Promise.all(
    documents.map(async (doc, index) => {
      console.log(`🔧 calculateFileSizes: Procesando documento ${index + 1}/${documents.length}: ID=${doc.id}, filePath="${doc.filePath}"`);
      
      // Si ya tenemos un tamaño válido del backend, usarlo como fallback
      const backendFileSize = doc.fileSize || 0;
      console.log(`📊 calculateFileSizes: Tamaño del backend para ${doc.id}: ${backendFileSize} bytes`);
      
      try {
        const calculatedFileSize = await getFileSize(doc.filePath, doc.id);
        console.log(`✅ calculateFileSizes: Documento ${index + 1} procesado: ${calculatedFileSize} bytes (calculado desde filesystem)`);
        return {
          ...doc,
          fileSize: calculatedFileSize,
          fileSizeSource: 'filesystem' as const
        };
      } catch (error) {
        console.error(`❌ calculateFileSizes: Error al procesar documento ${doc.id}:`, error);
        
        // Si el backend tiene un tamaño válido (> 0), usarlo
        if (backendFileSize > 0) {
          console.log(`📊 calculateFileSizes: Usando tamaño del backend para ${doc.id}: ${backendFileSize} bytes`);
          return {
            ...doc,
            fileSize: backendFileSize,
            fileSizeSource: 'backend' as const,
            fileSizeError: error instanceof Error ? error.message : 'Error desconocido'
          };
        }
        
        // Si no hay tamaño del backend, marcar como error pero mantener 0
        console.warn(`⚠️ calculateFileSizes: Sin tamaño disponible para ${doc.id}, manteniendo 0 bytes`);
        return {
          ...doc,
          fileSize: 0,
          fileSizeSource: 'none' as const,
          fileSizeError: error instanceof Error ? error.message : 'Error desconocido'
        };
      }
    })
  );

  const successCount = results.filter(doc => !('fileSizeError' in doc)).length;
  const backendCount = results.filter(doc => doc.fileSizeSource === 'backend').length;
  const filesystemCount = results.filter(doc => doc.fileSizeSource === 'filesystem').length;
  const errorCount = results.length - successCount;
  
  console.log(`
    🔧 calculateFileSizes: Procesamiento completado
    ✅ Éxitos: ${successCount}
    📊 Desde filesystem: ${filesystemCount}
    📊 Desde backend: ${backendCount}
    ❌ Errores: ${errorCount}
  `);

  return results;
}

// Función para determinar si un documento es obligatorio
function isRequiredDocument(documentType: string): boolean {
  return REQUIRED_DOCUMENT_TYPES.includes(documentType);
}

// Función para mapear estados del concurso a descripciones en español
function getContestStatusDescription(status: string): string {
  const statusMap: { [key: string]: string } = {
    'DRAFT': 'Borrador',
    'SCHEDULED': 'Programado',
    'ACTIVE': 'Activo - Inscripciones Abiertas',
    'CLOSED': 'Cerrado para Inscripciones - Periodo de Validación de Documentación',
    'PAUSED': 'Pausado',
    'CANCELLED': 'Cancelado',
    'FINISHED': 'Finalizado',
    'ARCHIVED': 'Archivado',
    'IN_EVALUATION': 'En Evaluación',
    'RESULTS_PUBLISHED': 'Resultados Publicados'
  };

  return statusMap[status] || status;
}

// Función para obtener información detallada del concurso
async function getContestDetails(contestId: number): Promise<any> {
  try {
    console.log(`🏆 Getting contest details for ID: ${contestId}`);

    // Usar endpoint local en lugar del backend externo
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003';
    const response = await fetch(`${baseUrl}/dashboard-monitor/api/contests/${contestId}`, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.warn(`❌ Contest API returned ${response.status} for contest ${contestId}`);
      return null;
    }

    const apiResponse = await response.json();
    const contestData = apiResponse.data;

    console.log(`✅ Retrieved contest data:`, {
      id: contestData.id,
      title: contestData.title,
      category: contestData.category,
      contestClass: contestData.contestClass,
      status: contestData.status,
      inscriptionStartDate: contestData.inscriptionStartDate,
      inscriptionEndDate: contestData.inscriptionEndDate
    });

    return contestData;
  } catch (error) {
    console.error(`❌ Error fetching contest ${contestId}:`, error);
    return null;
  }
}

// Función para calcular el estado de validación general
function calculateValidationStatus(documents: Document[]): {
  status: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'REJECTED';
  completionPercentage: number;
} {
  if (documents.length === 0) {
    return { status: 'PENDING', completionPercentage: 0 };
  }

  const requiredDocs = documents.filter(doc => doc.isRequired);

  if (requiredDocs.length === 0) {
    // Si no hay documentos obligatorios, basarse en todos los documentos
    const approved = documents.filter(doc => doc.validationStatus === 'APPROVED').length;
    const rejected = documents.filter(doc => doc.validationStatus === 'REJECTED').length;

    if (rejected > 0) return { status: 'REJECTED', completionPercentage: 0 };
    if (approved === documents.length) return { status: 'COMPLETED', completionPercentage: 100 };
    if (approved > 0) {
      return {
        status: 'PARTIAL',
        completionPercentage: Math.round((approved / documents.length) * 100)
      };
    }
    return { status: 'PENDING', completionPercentage: 0 };
  }

  const approvedRequired = requiredDocs.filter(doc => doc.validationStatus === 'APPROVED').length;
  const rejectedRequired = requiredDocs.filter(doc => doc.validationStatus === 'REJECTED').length;

  // Si hay documentos obligatorios rechazados, está rechazado
  if (rejectedRequired > 0) {
    return { status: 'REJECTED', completionPercentage: 0 };
  }

  // Si todos los obligatorios están aprobados, está completado
  if (approvedRequired === requiredDocs.length) {
    return { status: 'COMPLETED', completionPercentage: 100 };
  }

  // Si algunos están aprobados, está parcial
  if (approvedRequired > 0) {
    const percentage = Math.round((approvedRequired / requiredDocs.length) * 100);
    return { status: 'PARTIAL', completionPercentage: percentage };
  }

  // Todos pendientes
  return { status: 'PENDING', completionPercentage: 0 };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dni: string }> }
) {
  try {
    const { dni } = await params;
    console.log(`🔍 Fetching documents for postulant with DNI: ${dni}`);

    // Cambio principal: Buscar usuario en las inscripciones en lugar de la tabla de usuarios
    console.log(`📡 Buscando usuario con DNI ${dni} en inscripciones...`);
    
    // Obtener todas las inscripciones
    const inscriptionsResponse = await sessionBackendClient.getInscriptions({ size: 1000 });
    
    if (!inscriptionsResponse.success || !inscriptionsResponse.data?.content?.length) {
      console.error('❌ No se pudieron obtener inscripciones o están vacías');
      return NextResponse.json({
        success: false,
        error: 'No inscriptions found',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Buscar la inscripción que tenga el DNI solicitado
    const targetInscription = inscriptionsResponse.data.content.find((inscription: any) =>
      inscription.userInfo?.dni === dni
    );

    if (!targetInscription) {
      console.error(`❌ No se encontró inscripción para DNI: ${dni}`);
      return NextResponse.json({
        success: false,
        error: 'Postulant not found with that DNI',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    if (!targetInscription.userInfo) {
      console.error(`❌ No se encontró información de usuario para DNI: ${dni}`);
      return NextResponse.json({
        success: false,
        error: 'User information not found for this postulant',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    console.log(`👤 Found user from inscription: ${targetInscription.userInfo.fullName} (DNI: ${targetInscription.userInfo.dni})`);

    // Crear objeto user compatible con el resto del código
    const user = {
      id: targetInscription.userId,
      dni: targetInscription.userInfo.dni,
      fullName: targetInscription.userInfo.fullName,
      email: targetInscription.userInfo.email,
      username: targetInscription.userInfo.dni
    };

    // Usar la inscripción que encontramos
    const inscription = targetInscription;

    // Obtener documentos del usuario usando su ID
    const documentsResponse = await sessionBackendClient.getDocuments({
      usuario: user.id,
      size: 100
    });

    if (!documentsResponse.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch user documents',
        details: documentsResponse.error,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    const backendDocuments = documentsResponse.data?.content || [];
    // Filtrar solo documentos que pertenecen al usuario específico
    console.log(`🔍 FILTRO CRÍTICO: Filtrando ${backendDocuments.length} documentos del backend por usuario ${user.id}`);
    const userDocuments = backendDocuments.filter((doc: any) => {
      // Filtro 1: Por dniUsuario (campo del backend)
      if (doc.dniUsuario) {
        const userDni = user.dni || user.username;
        const matches = doc.dniUsuario === userDni;
        if (!matches) {
          console.log(`🚫 FILTRO: Descartando documento ${doc.id} - dniUsuario ${doc.dniUsuario} no coincide con ${userDni}`);
        }
        return matches;
      }
      
      // Filtro 2: Por usuarioId si está disponible (fallback)
      if (doc.usuarioId || doc.userId) {
        const docUserId = doc.usuarioId || doc.userId;
        const matches = docUserId === user.id;
        if (!matches) {
          console.log(`🚫 FILTRO: Descartando documento ${doc.id} - usuarioId ${docUserId} no coincide con ${user.id}`);
        }
        return matches;
      }
      
      // Filtro 2: Por filePath que debe contener el DNI del usuario
      if (doc.filePath || doc.rutaArchivo) {
        const filePath = doc.filePath || doc.rutaArchivo;
        const userDni = user.dni || user.username;
        const pathContainsDni = filePath.includes(userDni);
        if (!pathContainsDni) {
          console.log(`🚫 FILTRO: Descartando documento ${doc.id} - filePath "${filePath}" no contiene DNI ${userDni}`);
        }
        return pathContainsDni;
      }
      
      // Filtro 3: Si no hay información de usuario, descartar por seguridad
      console.log(`🚫 FILTRO: Descartando documento ${doc.id} - sin información de usuario`);
      return false;
    });
    console.log(`✅ FILTRO APLICADO: ${backendDocuments.length} -> ${userDocuments.length} documentos después del filtrado`);
    
    const backendDocuments_filtered = userDocuments;
    console.log(`📄 FILTRADO EXITOSO: ${backendDocuments.length} documentos originales -> ${backendDocuments_filtered.length} documentos del usuario ${user.dni || user.username}`);
    const backendDocuments_original = backendDocuments;

    // Función para determinar el tipo de documento basado en el nombre del archivo
    const getDocumentTypeFromName = (fileName: string): string => {
      if (!fileName) return 'UNKNOWN';

      // Remover la extensión del archivo
      const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");

      // Mapear nombres comunes a tipos de documento
      const nameMapping: { [key: string]: string } = {
        'DNI (Frontal)': 'DNI (Frontal)',
        'DNI (Dorso)': 'DNI (Dorso)',
        'Título Universitario y Certificado Analítico': 'Título Universitario y Certificado Analítico',
        'Certificado de Antecedentes Penales': 'Certificado de Antecedentes Penales',
        'Certificado Sin Sanciones Disciplinarias': 'Certificado Sin Sanciones Disciplinarias',
        'Certificado de Antigüedad Profesional': 'Certificado de Antigüedad Profesional',
        'Constancia de CUIL': 'Constancia de CUIL',
        'Certificado Ley Micaela': 'Certificado Ley Micaela',
        'Documento Adicional': 'Documento Adicional'
      };

      // Buscar coincidencia exacta
      if (nameMapping[nameWithoutExtension]) {
        return nameMapping[nameWithoutExtension];
      }

      // Buscar coincidencia parcial (contiene)
      for (const [key, value] of Object.entries(nameMapping)) {
        if (nameWithoutExtension.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().includes(nameWithoutExtension.toLowerCase())) {
          return value;
        }
      }

      // Si no se encuentra coincidencia, usar el nombre del archivo como tipo
      return nameWithoutExtension || 'UNKNOWN';
    };

    // Mapear documentos al formato requerido
    const documents: Document[] = backendDocuments_filtered.map((doc: any) => {
      const fileName = doc.fileName || doc.nombreArchivo;
      const originalName = doc.originalName || doc.nombreOriginal || fileName;
      const documentTypeFromBackend = doc.documentTypeId || doc.tipoDocumentoId || doc.documentType;

      // Construct filePath using DNI and filename since backend doesn't provide it
      const userDni = user.dni || user.username;
      const filePath = doc.filePath || doc.rutaArchivo || (userDni && fileName ? `${userDni}/${fileName}` : undefined);

      // Debug: Mostrar todos los campos relacionados con archivos
      console.log(`📄 DOC DEBUG - Processing document:`, {
        id: doc.id,
        fileName,
        originalName,
        filePath,
        fileSize: doc.fileSize || doc.tamaño,
        documentType: documentTypeFromBackend
      });

      // Usar el tipo del backend si está disponible, sino inferir del nombre
      const documentType = documentTypeFromBackend && documentTypeFromBackend !== 'UNKNOWN'
        ? documentTypeFromBackend
        : getDocumentTypeFromName(originalName || fileName);

      const isDocumentRequired = isRequiredDocument(documentType);
      console.log(`📄 Document: ${documentType} - Required: ${isDocumentRequired}`);

      return {
        id: doc.id,
        fileName: fileName,
        originalName: originalName,
        filePath: filePath,
        fileSize: doc.fileSize || doc.tamaño || 0,
        documentType: documentType,
        validationStatus: mapDocumentStatus(doc), // ✅ USAR FUNCIÓN UNIFICADA
        isRequired: isDocumentRequired,
        uploadDate: doc.uploadDate || doc.fechaSubida || doc.createdAt || new Date().toISOString(),
        validatedAt: doc.validatedAt || doc.fechaValidacion,
        validatedBy: doc.validatedBy || doc.validadoPor,
        comments: doc.comments || doc.comentarios,
        rejectionReason: doc.rejectionReason || doc.motivoRechazo,
        thumbnailUrl: undefined // TODO: Implement thumbnail generation
      };
    });

    // Calcular tamaños de archivos desde el sistema de archivos
    console.log(`📏 Calculating file sizes for ${documents.length} documents...`);
    const documentsWithSizes = await calculateFileSizes(documents);
    console.log(`📏 File sizes calculated successfully`);

    // Debug: Mostrar todos los documentos y su clasificación
    console.log('📊 DEBUG - Document classification:');
    documentsWithSizes.forEach((doc, index) => {
      console.log(`  ${index + 1}. "${doc.documentType}" (${doc.originalName || doc.fileName}) - Required: ${doc.isRequired}`);
    });

    const requiredDocs = documentsWithSizes.filter(doc => doc.isRequired);
    console.log(`📊 DEBUG - Required documents found: ${requiredDocs.length} of ${REQUIRED_DOCUMENT_TYPES.length}`);
    console.log(`📊 DEBUG - Required document types:`, REQUIRED_DOCUMENT_TYPES);
    console.log(`📊 DEBUG - Found required docs:`, requiredDocs.map(doc => doc.documentType));

    // Calcular estadísticas
    const stats = {
      total: documentsWithSizes.length,
      pending: documentsWithSizes.filter(doc => doc.validationStatus === 'PENDING').length,
      approved: documentsWithSizes.filter(doc => doc.validationStatus === 'APPROVED').length,
      rejected: documentsWithSizes.filter(doc => doc.validationStatus === 'REJECTED').length,
      required: requiredDocs.length,
      completionPercentage: 0
    };

    // Calcular estado de validación general
    const { status: validationStatus, completionPercentage } = calculateValidationStatus(documents);
    stats.completionPercentage = completionPercentage;

    // Obtener información detallada del concurso si hay inscripción
    let contestDetails = null;
    if (inscription?.contestId) {
      contestDetails = await getContestDetails(inscription.contestId);
    }

    console.log(`🏆 Contest details for modal:`, {
      contestId: inscription?.contestId,
      contestDetails: contestDetails ? {
        id: contestDetails.id,
        title: contestDetails.title,
        category: contestDetails.category,
        contestClass: contestDetails.contestClass,
        status: contestDetails.status
      } : 'Not found'
    });

    // Crear información del postulante con datos completos del concurso
    // Crear una función auxiliar para obtener el nombre completo
    const getFullName = (user: any): string => {
      if (user.fullName) return user.fullName;
      const firstName = user.firstName || '';
      const lastName = user.lastName || '';
      const composedName = `${firstName} ${lastName}`.trim();
      return composedName || user.name || 'Usuario sin nombre';
    };

    // Usar los datos de la inscripción y manejar posibles valores undefined
    const postulantInfo: PostulantInfo = {
      user: {
        dni: user.dni || user.username || 'Sin DNI',
        fullName: getFullName(user),
        email: user.email // Ya está marcado como opcional en la interfaz
      },
      inscription: {
        id: inscription?.id || 'unknown',
        state: inscription?.state || inscription?.status || 'ACTIVE',
        centroDeVida: inscription?.centroDeVida || 'No especificada',
        createdAt: inscription?.createdAt?.toString() || new Date().toISOString()
      },
      contest: {
        id: contestDetails?.id || inscription?.contestId || 1,
        title: contestDetails?.title || 'Concurso Multifuero MPD',
        category: contestDetails?.category || 'FUNCIONARIOS Y PERSONAL JERÁRQUICO',
        position: contestDetails?.position || 'Co-Defensor/Co-Asesor Multifuero',
        department: contestDetails?.department || contestDetails?.dependency || 'MULTIFUERO',
        contestClass: contestDetails?.contestClass || '03',
        status: contestDetails?.status || 'CLOSED',
        statusDescription: getContestStatusDescription(contestDetails?.status || 'CLOSED'),
        inscriptionStartDate: contestDetails?.inscriptionStartDate || contestDetails?.startDate || '2025-07-31T00:00:00',
        inscriptionEndDate: contestDetails?.inscriptionEndDate || contestDetails?.endDate || '2025-08-08T23:59:59',
        dependency: contestDetails?.dependency || contestDetails?.district,
        location: contestDetails?.location
      }
    };

    const result: DocumentsPageData = {
      postulant: postulantInfo,
      documents: documentsWithSizes,
      stats,
      validationStatus
    };

    // Log final de stats para debug del modal
    const allRequiredValidated = requiredDocs.length > 0 && requiredDocs.every(doc => doc.validationStatus !== "PENDING");

    console.log(`📊 MODAL DEBUG - Stats:`, {
      totalDocs: documents.length,
      requiredDocs: requiredDocs.length,
      allRequiredValidated,
      requiredDocsStatus: requiredDocs.map(doc => ({
        name: doc.documentType,
        status: doc.validationStatus,
        isRequired: doc.isRequired
      }))
    });

    console.log(`✅ Returning ${documents.length} documents with ${stats.completionPercentage}% completion`);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Postulant documents API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch postulant documents',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
