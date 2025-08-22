# 📋 ESPECIFICACIONES FUNCIONALES - SISTEMA DE REPORTES ADMINISTRATIVOS

## 🎯 ESPECIFICACIONES GENERALES

### **Objetivo Principal**
Proporcionar una herramienta integral para que el equipo administrativo del MPD pueda:
- Recopilar y analizar datos del proceso de validación
- Identificar problemas técnicos vs problemas de usuario
- Generar reportes oficiales con validez legal
- Optimizar el proceso de validación en tiempo real

### **Fuente de Datos**
**Fuente Única de Verdad**: Base de datos MySQL del sistema
- `user_entity` - Información de usuarios registrados
- `inscriptions` - Datos de inscripciones al concurso
- `documents` - Documentos cargados y su estado de validación
- `generated_reports` - Historial de reportes generados

**Referencia**: CSV administrativo (`docs/campos_para_reportes.csv`) 
- Solo como guía para entender necesidades administrativas
- NO es fuente de datos para reportes

## 📊 ESPECIFICACIONES DE FUNCIONALIDADES

### **1. DASHBOARD EJECUTIVO**

#### **A. Métricas en Tiempo Real**
```typescript
interface DashboardMetrics {
  // KPIs Principales
  totalUsers: number;                    // Total usuarios registrados
  totalDocuments: number;                // Total documentos cargados
  processingProgress: number;            // % de completitud del proceso
  averageProcessingTime: number;         // Tiempo medio de validación (minutos)
  
  // Estado de Documentos
  documentsApproved: number;             // Documentos aprobados
  documentsPending: number;              // Documentos pendientes
  documentsRejected: number;             // Documentos rechazados
  documentsWithTechnicalIssues: number; // Documentos con problemas técnicos
  
  // Distribución por Estado
  statusDistribution: {
    approved: number;
    pending: number; 
    rejected: number;
    technicalIssues: number;
  };
  
  // Tendencias
  dailyProgress: DailyProgressPoint[];   // Progreso diario últimos 30 días
  validationTrends: ValidationTrend[];   // Tendencias de validación
}
```

#### **B. Alertas Automáticas**
```typescript
interface SystemAlert {
  id: string;
  type: 'WARNING' | 'ERROR' | 'INFO' | 'SUCCESS';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  actionRequired: boolean;
  affectedUsers?: number;
  createdAt: Date;
}

// Tipos de Alertas:
// - Documentos con problemas técnicos
// - Usuarios con documentación incompleta
// - Archivos corruptos detectados
// - Cuellos de botella en validación
// - Plazos próximos a vencer
```

#### **C. Gráficos Interactivos**
- **Progreso de Validación**: Barra de progreso con meta y timeline
- **Distribución por Estado**: Donut chart con breakdown detallado
- **Tendencia Temporal**: Line chart del progreso diario
- **Tipos de Documentos**: Bar chart por categoría de documento
- **Motivos de Rechazo**: Histogram de razones más comunes

### **2. HERRAMIENTAS DE DIAGNÓSTICO**

#### **A. Detector de Problemas Técnicos**
```typescript
interface TechnicalIssue {
  documentId: string;
  userId: string;
  userDni: string;
  userName: string;
  issueType: TechnicalIssueType;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  isUserFault: boolean;            // false = problema técnico
  isRecoverable: boolean;          // true = se puede corregir
  detectedAt: Date;
  estimatedRecoveryTime?: number;  // minutos
  suggestedAction?: string;
}

type TechnicalIssueType = 
  | 'FILE_CORRUPTION'     // Archivo corrupto
  | 'UPLOAD_FAILED'       // Fallo en la carga
  | 'FORMAT_ERROR'        // Formato inválido
  | 'SIZE_EXCEEDED'       // Tamaño excedido
  | 'MISSING_METADATA'    // Metadatos faltantes
  | 'SYSTEM_ERROR'        // Error del sistema
  | 'PLACEHOLDER_FILE';   // Archivo placeholder
```

#### **B. Clasificador Automático de Rechazos**
```typescript
interface RejectionClassification {
  category: RejectionCategory;
  reason: string;
  count: number;
  percentage: number;
  isUserResponsible: boolean;
  correctionPossible: boolean;
  priority: number;
  examples: string[];              // Ejemplos de casos
}

type RejectionCategory = 
  | 'INCOMPLETE_DOCUMENT'    // Documento incompleto (falta dorso, etc.)
  | 'EXPIRED_DOCUMENT'       // Documento vencido
  | 'INVALID_FORMAT'         // Formato inválido
  | 'MISSING_SIGNATURE'      // Falta firma
  | 'TECHNICAL_CORRUPTION'   // Corrupción técnica
  | 'INSUFFICIENT_QUALITY'   // Calidad insuficiente
  | 'WRONG_DOCUMENT_TYPE';   // Tipo de documento incorrecto
```

#### **C. Análisis de Recuperabilidad**
```typescript
interface RecoveryAnalysis {
  documentId: string;
  recoveryScore: number;           // 0-100, probabilidad de recuperación exitosa
  recoveryMethod: RecoveryMethod;
  estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  requiredActions: RecoveryAction[];
  timeEstimate: number;            // horas de trabajo estimadas
  costBenefit: 'WORTH_IT' | 'BORDERLINE' | 'NOT_WORTH_IT';
}

interface RecoveryAction {
  action: string;
  responsibility: 'ADMIN' | 'USER' | 'SYSTEM';
  difficulty: number;              // 1-5
  automated: boolean;
}
```

### **3. TIPOS DE REPORTES**

#### **A. Reporte de Diagnóstico Técnico**
```typescript
interface TechnicalDiagnosticReport {
  metadata: ReportMetadata;
  summary: {
    totalIssuesDetected: number;
    userResponsibleIssues: number;
    systemResponsibleIssues: number;
    recoverableIssues: number;
    criticalIssues: number;
  };
  issuesByCategory: RejectionClassification[];
  affectedUsers: TechnicalIssueUser[];
  recommendedActions: RecommendedAction[];
  recoveryPlan: RecoveryPlan;
}
```

#### **B. Reporte de Completitud Documental**
```typescript
interface DocumentCompletenessReport {
  metadata: ReportMetadata;
  summary: {
    totalUsers: number;
    fullyCompliant: number;
    partiallyCompliant: number;
    nonCompliant: number;
    averageCompleteness: number;    // percentage
  };
  userCompleteness: UserCompletenessStatus[];
  documentTypeAnalysis: DocumentTypeStats[];
  complianceDistribution: ComplianceDistribution[];
}

interface UserCompletenessStatus {
  dni: string;
  fullName: string;
  totalDocumentsRequired: number;
  documentsSubmitted: number;
  documentsApproved: number;
  documentsRejected: number;
  documentsPending: number;
  completenessPercentage: number;
  status: 'COMPLETE' | 'INCOMPLETE' | 'REJECTED' | 'PENDING';
  missingDocuments: string[];
  issuesFound: string[];
}
```

#### **C. Reporte de Eficiencia Operativa**
```typescript
interface OperationalEfficiencyReport {
  metadata: ReportMetadata;
  kpis: {
    averageValidationTime: number;        // minutos
    dailyThroughput: number;              // documentos/día
    validatorProductivity: ValidatorStats[];
    peakProcessingHours: HourStats[];
    errorRate: number;                    // percentage
    reworkRate: number;                   // percentage
  };
  trends: {
    productivityTrend: TrendPoint[];
    qualityTrend: TrendPoint[];
    volumeTrend: TrendPoint[];
  };
  bottlenecks: BottleneckAnalysis[];
  recommendations: EfficiencyRecommendation[];
}
```

#### **D. Reporte Final Oficial (Legal)**
```typescript
interface OfficialFinalReport {
  // Cabecera Institucional
  header: {
    institutionName: string;
    contestTitle: string;
    reportDate: Date;
    reportPeriod: DateRange;
    responsibleOfficial: string;
    digitalSignature: string;
    verificationCode: string;
  };
  
  // Resumen Ejecutivo
  executiveSummary: {
    totalApplicants: number;
    totalDocumentsProcessed: number;
    validationPeriod: DateRange;
    finalResults: FinalResultSummary;
  };
  
  // Listados Oficiales
  approvedApplicants: ApprovedApplicant[];
  rejectedApplicants: RejectedApplicant[];
  pendingApplicants: PendingApplicant[];
  
  // Anexos
  appendices: {
    technicalIssuesLog: TechnicalIssue[];
    validationCriteria: ValidationCriteria[];
    processTimeline: ProcessTimeline[];
    statisticalAnalysis: StatisticalSummary;
  };
  
  // Firmas y Validaciones
  certifications: {
    dataIntegrityHash: string;
    generationTimestamp: Date;
    validationChecksum: string;
    legalDisclaimer: string;
  };
}
```

### **4. HERRAMIENTAS DE CONFIGURACIÓN**

#### **A. Gestión de Plantillas**
```typescript
interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  version: string;
  isActive: boolean;
  templateData: {
    header: TemplateSection;
    body: TemplateSection;
    footer: TemplateSection;
  };
  variables: TemplateVariable[];
  styling: TemplateStyle;
  createdAt: Date;
  updatedAt: Date;
}
```

#### **B. Automatización y Programación**
```typescript
interface ScheduledReport {
  id: string;
  reportType: ReportType;
  schedule: CronExpression;
  parameters: ReportParameters;
  recipients: EmailRecipient[];
  isActive: boolean;
  lastRun?: Date;
  nextRun: Date;
  format: ExportFormat[];
}
```

## 🔍 CRITERIOS DE VALIDACIÓN Y REGLAS DE NEGOCIO

### **Clasificación de Problemas**
```typescript
// Reglas para determinar responsabilidad
const issueClassificationRules = {
  // Problemas NO imputables al usuario (elegibles para corrección)
  notUserFault: [
    'FILE_CORRUPTION',      // Corrupción durante procesamiento
    'SYSTEM_ERROR',         // Error del sistema
    'UPLOAD_FAILED',        // Fallo técnico en carga
    'PLACEHOLDER_FILE'      // Archivo placeholder por error
  ],
  
  // Problemas imputables al usuario
  userFault: [
    'INCOMPLETE_DOCUMENT',  // Documento incompleto (falta dorso)
    'EXPIRED_DOCUMENT',     // Documento vencido
    'MISSING_SIGNATURE',    // Falta firma
    'WRONG_DOCUMENT_TYPE'   // Tipo incorrecto
  ],
  
  // Problemas recuperables automáticamente
  autoRecoverable: [
    'FORMAT_ERROR',         // Conversión automática posible
    'SIZE_EXCEEDED',        // Compresión automática
    'MISSING_METADATA'      // Regeneración de metadatos
  ]
};
```

### **Estados de Postulación**
```typescript
type PostulationStatus = 
  | 'COMPLETE'              // Documentación completa y aprobada
  | 'INCOMPLETE'            // Falta documentación
  | 'UNDER_REVIEW'          // En proceso de validación
  | 'TECHNICAL_ISSUES'      // Problemas técnicos identificados
  | 'USER_ACTION_REQUIRED'  // Requiere acción del usuario
  | 'REJECTED'              // Rechazado definitivamente
  | 'ELIGIBLE_FOR_RECOVERY'; // Elegible para corrección técnica
```

## 📊 MÉTRICAS Y KPIs

### **KPIs Operativos**
- **Tiempo Medio de Validación**: < 15 minutos por documento
- **Tasa de Acierto en Primera Validación**: > 85%
- **Throughput Diario**: Meta documentos procesados/día
- **Tasa de Problemas Técnicos**: < 5% de documentos
- **Tiempo de Resolución de Issues**: < 24 horas

### **KPIs de Calidad**
- **Tasa de Rework**: < 10% de documentos requieren revalidación
- **Satisfacción del Proceso**: Medida por feedback administrativo
- **Integridad de Datos**: 100% de datos verificables
- **Disponibilidad del Sistema**: > 99.5% uptime

---

**Versión**: 1.0  
**Actualizado**: Agosto 2025  
**Estado**: Especificación Funcional Detallada  
