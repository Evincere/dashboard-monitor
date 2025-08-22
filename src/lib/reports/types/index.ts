export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV' | 'JSON';

export interface ReportRequest {
    type: string;
    format: ReportFormat;
    filters?: Record<string, any>;
}

export interface Report {
    id: string;
    userId: string;
    type: string;
    status: 'pending' | 'completed' | 'failed';
    createdAt: Date;
    completedAt?: Date;
    format: ReportFormat;
    filters?: Record<string, any>;
    error?: string;
}

export interface ReportDownload {
    content: Buffer;
    format: ReportFormat;
}

export * from './validation';
export * from './metrics';
export * from './db';
