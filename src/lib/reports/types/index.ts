// ===================================
// TIPOS CENTRALES - SISTEMA REPORTES
// ===================================

// Filtros para consultas de reportes
export interface ReportFilter {
  dateRange?: {
    from: Date;
    to: Date;
  };
  documentStatus?: DocumentStatus[];
  userId?: string;
  documentType?: string;
  issueType?: TechnicalIssueType[];
}

// Métricas principales del dashboard
export interface DashboardMetrics {
  // KPIs Principales
  totalUsers: number;
  totalDocuments: number;
  processingProgress: number;
  averageProcessingTime: number;
  
  // Estado de Documentos
  documentsApproved: number;
  documentsPending: number;
  documentsRejected: number;
  documentsWithTechnicalIssues: number;
  
  // Distribución por Estado
  statusDistribution: {
    approved: number;
    pending: number;
    rejected: number;
    technicalIssues: number;
  };
  
  // Tendencias (últimos 30 días)
  dailyProgress: DailyProgressPoint[];
}

// Punto de progreso diario
export interface DailyProgressPoint {
  date: string;
  approved: number;
  pending: number;
  rejected: number;
}

// Problema técnico identificado
export interface TechnicalIssue {
  documentId: string;
  userId: string;
  userDni: string;
  userName: string;
  issueType: TechnicalIssueType;
  description: string;
  severity: IssueSeverity;
  isUserFault: boolean;
  isRecoverable: boolean;
  detectedAt: Date;
  estimatedRecoveryTime?: number;
  suggestedAction?: string;
}

// ===============
// ENUMS Y TIPOS
// ===============

export type DocumentStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

export type IssueSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export type TechnicalIssueType = 
  | 'FILE_CORRUPTION'
  | 'UPLOAD_FAILED'  
  | 'FORMAT_ERROR'
  | 'SIZE_EXCEEDED'
  | 'MISSING_METADATA'
  | 'SYSTEM_ERROR'
  | 'PLACEHOLDER_FILE';

export type ReportType = 
  | 'TECHNICAL_DIAGNOSTIC'
  | 'DOCUMENT_COMPLETENESS'  
  | 'OPERATIONAL_EFFICIENCY'
  | 'OFFICIAL_FINAL';

export type ExportFormat = 'PDF' | 'EXCEL' | 'CSV';
