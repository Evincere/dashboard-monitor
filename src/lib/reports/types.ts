export type ReportType = 'FINAL_RESULTS' | 'VALIDATION_PROGRESS' | 'AUDIT_TRAIL';
export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV' | 'JSON';

export interface FinalResultsReport {
    metadata: {
        contestTitle: string;
        generatedAt: string;
        generatedBy: string;
        totalPostulations: number;
        validationPeriod: {
            start: string;
            end: string;
        };
    };
    approved: {
        count: number;
        postulations: Array<{
            userId: string;
            fullName: string;
            dni: string;
            validationDate: string;
            documentsValidated: number;
            observations: string;
        }>;
    };
    rejected: {
        count: number;
        postulations: Array<{
            userId: string;
            fullName: string;
            dni: string;
            rejectionReason: string;
            validationDate: string;
            documentsValidated: number;
        }>;
        rejectionReasons: Array<{
            reason: string;
            count: number;
            percentage: number;
        }>;
    };
    summary: {
        approvalRate: number;
        averageValidationTime: number;
        documentsProcessed: number;
    };
};

export interface ReportRequest {
    type: ReportType;
    format: ReportFormat;
    filters?: {
        dateRange?: { start: string; end: string };
        status?: string[];
        validator?: string;
        contestId?: number;
        includeDocuments?: boolean;
        includeAuditTrail?: boolean;
    };
}

export interface GeneratedReport {
    id: string;
    reportType: ReportType;
    format: ReportFormat;
    filePath: string;
    fileSize: number;
    generatedBy: string;
    generatedAt: Date;
    parameters: Record<string, any>;
    contestId: number;
    status: 'GENERATING' | 'COMPLETED' | 'FAILED';
    errorMessage?: string;
    downloadCount: number;
    expiresAt?: Date;
}

export interface ValidationProgressReport {
    overview: {
        totalPostulations: number;
        validationCompleted: number;
        validationPending: number;
        validationInProgress: number;
    };
    byValidator: ValidatorMetrics[];
    byDocumentType: DocumentTypeMetrics[];
    timelineData: ValidationTimelinePoint[];
}

export interface ValidatorMetrics {
    validatorId: string;
    validatorName: string;
    validatedCount: number;
    averageValidationTime: number;
}

export interface DocumentTypeMetrics {
    documentType: string;
    approved: number;
    rejected: number;
    pending: number;
}

export interface ValidationTimelinePoint {
    date: string;
    validatedCount: number;
    approvedCount: number;
    rejectedCount: number;
}

export interface AuditReport {
    validationActions: ValidationAction[];
    systemEvents: SystemEvent[];
    documentChanges: DocumentChange[];
    userActions: UserAction[];
}

export interface ValidationAction {
    actionId: string;
    documentId: string;
    validatorId: string;
    action: 'APPROVE' | 'REJECT';
    timestamp: Date;
    comments?: string;
}

export interface SystemEvent {
    eventId: string;
    eventType: string;
    timestamp: Date;
    details: Record<string, any>;
}

export interface DocumentChange {
    changeId: string;
    documentId: string;
    changedBy: string;
    timestamp: Date;
    previousVersion: string;
    newVersion: string;
}

export interface UserAction {
    actionId: string;
    userId: string;
    actionType: string;
    timestamp: Date;
    details: Record<string, any>;
}
