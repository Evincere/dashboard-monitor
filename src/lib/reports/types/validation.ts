export interface ValidationStats {
    validationCompleted: number;
    validationPending: number;
    validationInProgress: number;
}

export interface DocumentStatusCount {
    status: string;
    _count: number;
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
    pending?: number; // Optional since it's not used in current implementation
}

export interface ValidationTimelinePoint {
    date: string;
    validationsCount: number;
    approvalRate: number;
    validatorCount: number;
    validatedCount?: number;  // Optional for backward compatibility
    approvedCount?: number;   // Optional for backward compatibility
    rejectedCount?: number;   // Optional for backward compatibility
}

export interface ValidationOverview {
    totalPostulations: number;
    validationCompleted: number;
    validationPending: number;
    validationInProgress: number;
}
