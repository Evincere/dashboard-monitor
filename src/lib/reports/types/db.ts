export interface Document {
    id: number;
    contestId: number | null;
    document_audit: DocumentAudit[];
}

export interface DocumentAudit {
    id: number;
    userId: string;
    action: string;
    createdAt: Date;
    comments: string | null;
    status: string;
}

export interface SecurityEvent {
    id: number;
    eventType: string;
    timestamp: Date;
    details: string | null;
    metadata: string | null;
}

export interface AuditLog {
    id: number;
    userId: string;
    action: string;
    timestamp: Date;
    details: string | null;
    metadata: string | null;
}
