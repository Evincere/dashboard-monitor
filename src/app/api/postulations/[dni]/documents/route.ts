import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

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
  : 'B:\\concursos_situacion_post_gracia\\descarga_administracion_20250814_191745\\documentos'
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
    console.warn(`📏 getFileSize: filePath is empty`);
    return 0;
  }

  try {
    console.log(`📏 getFileSize: Processing filePath: "${filePath}" with documentId: "${documentId}"`);

    // Extract DNI from filePath (e.g., "35515608/filename.pdf" -> "35515608")
    const pathParts = filePath.split('/');
    const dni = pathParts[0];
    const fileName = pathParts[pathParts.length - 1];

    console.log(`📏 getFileSize: Extracted DNI: "${dni}", fileName: "${fileName}"`);

    // Get environment-aware document base paths
    const possibleBasePaths = getDocumentBasePaths();

    console.log(`📏 getFileSize: Environment = ${NODE_ENV}, Checking ${possibleBasePaths.length} possible base paths`);

    // First, try exact path matching
    for (const basePath of possibleBasePaths) {
      const exactPath = path.join(basePath, filePath);
      try {
        console.log(`📏 getFileSize: Trying exact path: "${exactPath}"`);
        const stats = await fs.promises.stat(exactPath);
        if (stats.isFile()) {
          console.log(`✅ getFileSize: File found (exact match)! Size: ${stats.size} bytes at "${exactPath}"`);
          return stats.size;
        }
      } catch (err: any) {
        console.log(`❌ getFileSize: Exact path failed: ${err.code || err.message}`);
        continue;
      }
    }

    // If exact match fails and we have a documentId, try fuzzy matching
    if (documentId && dni) {
      console.log(`📏 getFileSize: Exact match failed, trying fuzzy matching with documentId: ${documentId}`);

      for (const basePath of possibleBasePaths) {
        const userDir = path.join(basePath, dni);
        try {
          const files = await fs.promises.readdir(userDir);
          console.log(`📏 getFileSize: Found ${files.length} files in "${userDir}"`);

          // Look for files that start with the documentId
          const matchingFile = files.find(file => file.startsWith(documentId));

          if (matchingFile) {
            const fullPath = path.join(userDir, matchingFile);
            console.log(`📏 getFileSize: Found fuzzy match: "${matchingFile}"`);

            const stats = await fs.promises.stat(fullPath);
            if (stats.isFile()) {
              console.log(`✅ getFileSize: File found (fuzzy match)! Size: ${stats.size} bytes at "${fullPath}"`);
              return stats.size;
            }
          }
        } catch (err: any) {
          console.log(`❌ getFileSize: Fuzzy matching in "${userDir}" failed: ${err.code || err.message}`);
          continue;
        }
      }
    }

    // If no file found, return 0
    console.warn(`📏 getFileSize: Could not find file in any path for: ${filePath}`);
    return 0;
  } catch (error) {
    console.error(`📏 getFileSize: Unexpected error for ${filePath}:`, error);
    return 0;
  }
}

/**
 * Calculate file sizes for documents concurrently
 * @param documents - Array of document objects
 * @returns Array of documents with calculated file sizes
 */
async function calculateFileSizes(documents: Document[]): Promise<Document[]> {
  console.log(`🔧 calculateFileSizes: Processing ${documents.length} documents`);

  const sizePromises = documents.map(async (doc, index) => {
    console.log(`🔧 calculateFileSizes: Processing document ${index + 1}/${documents.length}: ID=${doc.id}, filePath="${doc.filePath}"`);
    const calculatedFileSize = await getFileSize(doc.filePath, doc.id);
    console.log(`🔧 calculateFileSizes: Document ${index + 1} result: ${calculatedFileSize} bytes`);
    return {
      ...doc,
      fileSize: calculatedFileSize > 0 ? calculatedFileSize : doc.fileSize
    };
  });

  const results = await Promise.all(sizePromises);
  console.log(`🔧 calculateFileSizes: Completed processing all documents`);
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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/contests/${contestId}`, {
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

    // Buscar usuario por DNI - obtener todos los usuarios como en la API de gestión
    const usersResponse = await backendClient.getUsers({ size: 1000 });

    if (!usersResponse.success || !usersResponse.data?.content?.length) {
      return NextResponse.json({
        success: false,
        error: 'Postulant not found',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Buscar el usuario exacto por DNI en la lista completa
    const user = usersResponse.data.content.find((u: any) =>
      (u.dni === dni) || (u.username === dni)
    );

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Postulant not found with exact DNI match',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    console.log(`👤 Found user: ${user.fullName || user.name} (ID: ${user.id})`);

    // Obtener inscripción del usuario
    const inscriptionsResponse = await backendClient.getInscriptions({
      userId: user.id,
      size: 10
    });

    let inscription = null;
    if (inscriptionsResponse.success && inscriptionsResponse.data?.content?.length) {
      inscription = inscriptionsResponse.data.content[0]; // Tomar la primera inscripción
    }

    // Obtener documentos del usuario
    const documentsResponse = await backendClient.getDocuments({
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

    // Usar los datos del backend y manejar posibles valores undefined
    const postulantInfo: PostulantInfo = {
      user: {
        dni: user.dni || user.username || 'Sin DNI',
        fullName: getFullName(user),
        email: user.email // Ya está marcado como opcional en la interfaz
      },
      inscription: {
        id: inscription?.id || 'unknown',
        state: (inscription as any)?.state || (inscription as any)?.status || 'ACTIVE', // Type assertion para evitar error
        centroDeVida: (inscription as any)?.centroDeVida || 'No especificada',
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
