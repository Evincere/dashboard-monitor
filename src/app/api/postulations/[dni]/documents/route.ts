import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

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
    email: string;
  };
  inscription: {
    state: string;
    centroDeVida: string;
    createdAt: string;
  };
  contest: {
    title: string;
    position: string;
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

// Tipos de documentos obligatorios
const REQUIRED_DOCUMENT_TYPES = [
  'CV',
  'TITULO',
  'DNI',
  'CERTIFICADO_DOMICILIO',
  'CERTIFICADO_ANTECEDENTES'
];

// Función para determinar si un documento es obligatorio
function isRequiredDocument(documentType: string): boolean {
  return REQUIRED_DOCUMENT_TYPES.includes(documentType);
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
      usuarioId: user.id,
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
    console.log(`📄 Found ${backendDocuments.length} documents for user`);

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
    const documents: Document[] = backendDocuments.map((doc: any) => {
      const fileName = doc.fileName || doc.nombreArchivo;
      const originalName = doc.originalName || doc.nombreOriginal || fileName;
      const documentTypeFromBackend = doc.documentTypeId || doc.tipoDocumentoId || doc.documentType;
      
      // Usar el tipo del backend si está disponible, sino inferir del nombre
      const documentType = documentTypeFromBackend && documentTypeFromBackend !== 'UNKNOWN' 
        ? documentTypeFromBackend 
        : getDocumentTypeFromName(originalName || fileName);
      
      return {
        id: doc.id,
        fileName: fileName,
        originalName: originalName,
        filePath: doc.filePath || doc.rutaArchivo,
        fileSize: doc.fileSize || doc.tamaño || 0,
        documentType: documentType,
        validationStatus: (doc.status || doc.estado || 'PENDING') as 'PENDING' | 'APPROVED' | 'REJECTED',
        isRequired: isRequiredDocument(documentType),
        uploadDate: doc.uploadDate || doc.fechaSubida || doc.createdAt || new Date().toISOString(),
        validatedAt: doc.validatedAt || doc.fechaValidacion,
        validatedBy: doc.validatedBy || doc.validadoPor,
        comments: doc.comments || doc.comentarios,
        rejectionReason: doc.rejectionReason || doc.motivoRechazo,
        thumbnailUrl: undefined // TODO: Implement thumbnail generation
      };
    });

    // Calcular estadísticas
    const stats = {
      total: documents.length,
      pending: documents.filter(doc => doc.validationStatus === 'PENDING').length,
      approved: documents.filter(doc => doc.validationStatus === 'APPROVED').length,
      rejected: documents.filter(doc => doc.validationStatus === 'REJECTED').length,
      required: documents.filter(doc => doc.isRequired).length,
      completionPercentage: 0
    };

    // Calcular estado de validación general
    const { status: validationStatus, completionPercentage } = calculateValidationStatus(documents);
    stats.completionPercentage = completionPercentage;

    // Crear información del postulante
    const postulantInfo: PostulantInfo = {
      user: {
        dni: user.dni || user.username,
        fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name,
        email: user.email
      },
      inscription: {
        state: inscription?.state || inscription?.status || 'ACTIVE',
        centroDeVida: inscription?.centroDeVida || 'No especificada',
        createdAt: inscription?.createdAt || inscription?.inscriptionDate || new Date().toISOString()
      },
      contest: {
        title: inscription?.contest?.title || 'Concurso Multifuero MPD',
        position: inscription?.contest?.position || 'Magistrado/a'
      }
    };

    const result: DocumentsPageData = {
      postulant: postulantInfo,
      documents,
      stats,
      validationStatus
    };

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
