export interface Postulation {
    userId: string;
    users?: {
        firstName?: string;
        lastName?: string;
        dni?: string;
    };
    documents: any[]; // Could be made more specific based on your document type
    updatedAt?: Date;
    observations?: string;
    inscription_notes?: Array<{
        note?: string;
    }>;
}

export interface DocumentTypeCount {
    documentType: string;
    approved: number;
    rejected: number;
    pending: number;
}

export interface TimelineDataPoint {
    date: string;
    validationsCount: number;
    approvalRate: number;
    validatorCount: number;
    validatedCount: number;
    approvedCount: number;
    rejectedCount: number;
}
