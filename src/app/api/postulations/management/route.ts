import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * @fileOverview API para gestión de postulaciones
 * Combina datos de usuarios, inscripciones y documentos para crear una vista unificada
 */

interface PostulationData {
  id: string;
  user: {
    dni: string;
    fullName: string;
    email: string;
  };
  inscription: {
    id: string;
    state: string;
    centroDeVida: string;
    createdAt: string;
  };
  contest: {
    title: string;
    position: string;
  };
  documents: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    required: number;
    types: string[];
  };
  validationStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'REJECTED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  completionPercentage: number;
}

interface PostulationsStats {
  total: number;
  completedWithDocs: number;
  validationPending: number;
  validationCompleted: number;
  validationRejected: number;
}

// Tipos de documentos obligatorios por concurso
const REQUIRED_DOCUMENT_TYPES = [
  'CV',
  'TITULO',
  'DNI',
  'CERTIFICADO_DOMICILIO',
  'CERTIFICADO_ANTECEDENTES'
];

// Función para determinar el estado de validación de una postulación
function calculateValidationStatus(documents: any[]): {
  status: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'REJECTED';
  completionPercentage: number;
} {
  if (documents.length === 0) {
    return { status: 'PENDING', completionPercentage: 0 };
  }

  const requiredDocs = documents.filter(doc => 
    REQUIRED_DOCUMENT_TYPES.includes(doc.documentTypeId || doc.documentType)
  );
  
  const approvedRequired = requiredDocs.filter(doc => doc.status === 'APPROVED').length;
  const rejectedRequired = requiredDocs.filter(doc => doc.status === 'REJECTED').length;
  const pendingRequired = requiredDocs.filter(doc => doc.status === 'PENDING').length;

  // Si hay documentos obligatorios rechazados, la postulación está rechazada
  if (rejectedRequired > 0) {
    return { status: 'REJECTED', completionPercentage: 0 };
  }

  // Si todos los documentos obligatorios están aprobados
  if (approvedRequired === requiredDocs.length && requiredDocs.length > 0) {
    return { status: 'COMPLETED', completionPercentage: 100 };
  }

  // Si hay algunos aprobados pero no todos
  if (approvedRequired > 0) {
    const percentage = Math.round((approvedRequired / requiredDocs.length) * 100);
    return { status: 'PARTIAL', completionPercentage: percentage };
  }

  // Todos están pendientes
  return { status: 'PENDING', completionPercentage: 0 };
}

// Función para determinar la prioridad de una postulación
function calculatePriority(inscription: any, documents: any[]): 'HIGH' | 'MEDIUM' | 'LOW' {
  // Prioridad alta: inscripciones más antiguas o con problemas
  const inscriptionDate = new Date(inscription.createdAt || inscription.inscriptionDate);
  const daysSinceInscription = (Date.now() - inscriptionDate.getTime()) / (1000 * 60 * 60 * 24);

  // Alta prioridad para inscripciones de más de 30 días
  if (daysSinceInscription > 30) return 'HIGH';

  // Alta prioridad si hay documentos rechazados que necesitan corrección
  const hasRejectedDocs = documents.some(doc => doc.status === 'REJECTED');
  if (hasRejectedDocs) return 'HIGH';

  // Media prioridad para inscripciones de 15-30 días
  if (daysSinceInscription > 15) return 'MEDIUM';

  // Baja prioridad para inscripciones recientes
  return 'LOW';
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Fetching postulations management data from backend endpoint...');

    // Usar directamente el endpoint del backend principal
    const managementResponse = await backendClient.getPostulationsManagement();
    
    if (!managementResponse.success) {
      throw new Error(`Failed to fetch postulations management data: ${managementResponse.error}`);
    }

    console.log(`✅ Successfully fetched data from backend endpoint`);
    console.log(`📊 Received ${managementResponse.data?.postulations?.length || 0} postulations`);
    console.log(`📈 Stats:`, managementResponse.data?.stats);

    // Retornar directamente la respuesta del backend principal
    return NextResponse.json(managementResponse.data);

  } catch (error) {
    console.error('❌ Postulations management API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch postulations management data',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
