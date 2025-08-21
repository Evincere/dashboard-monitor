/**
 * @fileOverview Utilidades unificadas para el mapeo de estados de documentos
 * Esta función asegura consistencia entre todos los endpoints que manejan documentos
 */

export type DocumentValidationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Mapea el estado de un documento desde el backend al formato estándar del frontend
 * 
 * IMPORTANTE: Esta función debe ser la ÚNICA fuente de verdad para mapear estados
 * de documentos en todo el sistema frontend.
 * 
 * @param backendDoc - Documento del backend con posibles campos de estado
 * @returns Estado validado en formato estándar
 */
export function mapDocumentStatus(backendDoc: any): DocumentValidationStatus {
  // Priorizar el campo 'estado' que es el mapeo oficial del backend desde document.getStatus().name()
  // Fallback a 'status' por compatibilidad, luego 'PENDING' por defecto
  const rawStatus = backendDoc.estado || backendDoc.status;
  
  if (!rawStatus) {
    console.warn('📄 mapDocumentStatus: No status field found in backend document, defaulting to PENDING');
    return 'PENDING';
  }
  
  const statusStr = String(rawStatus).toUpperCase();
  
  // Mapeo directo de estados del backend (enum DocumentStatus en Java)
  // Referencia: PENDING, APPROVED, REJECTED, PROCESSING, ERROR
  switch (statusStr) {
    case 'APPROVED':
      return 'APPROVED';
    case 'REJECTED':
      return 'REJECTED';
    case 'PENDING':
      return 'PENDING';
    case 'PROCESSING':
      return 'PENDING'; // Estados en proceso se muestran como pendientes
    case 'ERROR':
      return 'REJECTED'; // Estados con error se muestran como rechazados
    default:
      console.warn(`📄 mapDocumentStatus: Unknown status "${rawStatus}", defaulting to PENDING`);
      return 'PENDING';
  }
}

/**
 * Mapea un documento completo del backend al formato frontend
 * Utiliza la función unificada de mapeo de estados
 * 
 * @param backendDoc - Documento del backend
 * @returns Documento mapeado para el frontend
 */
export function mapBackendDocumentToFrontend(backendDoc: any) {
  return {
    id: backendDoc.id || backendDoc.documentId,
    name: backendDoc.nombreArchivo || backendDoc.fileName || backendDoc.name || backendDoc.originalName,
    originalName: backendDoc.nombreArchivo || backendDoc.originalName || backendDoc.fileName || backendDoc.name,
    filePath: backendDoc.filePath || backendDoc.path,
    fileSize: backendDoc.fileSize || backendDoc.size || 0,
    mimeType: backendDoc.contentType || backendDoc.mimeType || 'application/octet-stream',
    documentType: backendDoc.tipoDocumento?.nombre || backendDoc.documentType?.nombre || backendDoc.documentType || 'Documento',
    validationStatus: mapDocumentStatus(backendDoc), // ✅ USAR FUNCIÓN UNIFICADA
    createdAt: backendDoc.fechaCarga || backendDoc.uploadDate || backendDoc.createdAt || new Date().toISOString(),
    updatedAt: backendDoc.fechaValidacion || backendDoc.validatedAt || backendDoc.updatedAt || new Date().toISOString(),
    user: {
      id: backendDoc.dniUsuario || backendDoc.userId || backendDoc.user?.id || 'unknown',
      name: backendDoc.nombreUsuario || backendDoc.user?.fullName || backendDoc.user?.name || 'Usuario',
      email: backendDoc.emailUsuario || backendDoc.user?.email || 'usuario@example.com'
    },
    contest: backendDoc.contestId ? {
      id: backendDoc.contestId,
      title: backendDoc.contest?.title || 'Concurso'
    } : null
  };
}

/**
 * Valida que un estado sea válido
 * @param status - Estado a validar
 * @returns true si el estado es válido
 */
export function isValidDocumentStatus(status: any): status is DocumentValidationStatus {
  return ['PENDING', 'APPROVED', 'REJECTED'].includes(status);
}

/**
 * Obtiene la descripción en español de un estado
 * @param status - Estado del documento
 * @returns Descripción legible del estado
 */
export function getStatusDescription(status: DocumentValidationStatus): string {
  const descriptions = {
    'PENDING': 'Pendiente',
    'APPROVED': 'Aprobado',
    'REJECTED': 'Rechazado'
  };
  
  return descriptions[status];
}

/**
 * Log de debugging para análisis de mapeo de estados
 * @param backendDoc - Documento del backend
 * @param mappedStatus - Estado mapeado
 */
export function logStatusMapping(backendDoc: any, mappedStatus: DocumentValidationStatus): void {
  console.log('📄 STATUS MAPPING:', {
    originalEstado: backendDoc.estado,
    originalStatus: backendDoc.status,
    mappedTo: mappedStatus,
    documentId: backendDoc.id,
    fileName: backendDoc.fileName || backendDoc.name
  });
}
