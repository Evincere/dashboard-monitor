import { GeneratedReport, ReportRequest } from './types';
import { executeQuery, executeQuerySingle } from '../db/mysql';
import { v4 as uuidv4 } from 'uuid';

export class ReportService {
    private static instance: ReportService;

    private constructor() { }

    public static getInstance(): ReportService {
        if (!ReportService.instance) {
            ReportService.instance = new ReportService();
        }
        return ReportService.instance;
    }

    async createReport(request: ReportRequest, userId: string): Promise<GeneratedReport> {
        const reportId = uuidv4();
        const now = new Date();
        
        await executeQuery(`
            INSERT INTO generated_reports (
                id, reportType, format, generatedBy, parameters, 
                status, downloadCount, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            reportId,
            request.type,
            request.format,
            userId,
            JSON.stringify(request.filters || {}),
            'GENERATING',
            0,
            now,
            now
        ]);

        return {
            id: reportId,
            reportType: request.type,
            format: request.format,
            generatedBy: userId,
            parameters: request.filters || {},
            status: 'GENERATING',
            downloadCount: 0,
            generatedAt: now,
            updatedAt: now,
            filePath: '', // Will be set when report is completed
            fileSize: 0, // Will be set when report is completed
            contestId: request.filters?.contestId || 0 // Use contestId from filters or default to 0
        } as GeneratedReport;
    }

    async updateReportStatus(
        reportId: string,
        status: 'COMPLETED' | 'FAILED',
        filePath?: string,
        fileSize?: number,
        errorMessage?: string
    ): Promise<GeneratedReport> {
        const now = new Date();
        
        await executeQuery(`
            UPDATE generated_reports 
            SET status = ?, filePath = ?, fileSize = ?, errorMessage = ?, updatedAt = ?
            WHERE id = ?
        `, [status, filePath || null, fileSize || null, errorMessage || null, now, reportId]);

        const updatedReport = await this.getReport(reportId);
        if (!updatedReport) {
            throw new Error(`Report with id ${reportId} not found after update`);
        }
        
        return updatedReport;
    }

    async getReport(reportId: string): Promise<GeneratedReport | null> {
        const report = await executeQuerySingle<any>(`
            SELECT * FROM generated_reports WHERE id = ?
        `, [reportId]);

        if (!report) return null;

        return {
            id: report.id,
            reportType: report.reportType,
            format: report.format,
            generatedBy: report.generatedBy,
            parameters: typeof report.parameters === 'string' 
                ? JSON.parse(report.parameters) 
                : report.parameters,
            status: report.status,
            filePath: report.filePath || '',
            fileSize: report.fileSize || 0,
            downloadCount: report.downloadCount,
            errorMessage: report.errorMessage,
            generatedAt: report.createdAt,
            updatedAt: report.updatedAt,
            contestId: report.contestId || 0
        } as GeneratedReport;
    }

    async getReportHistory(userId: string): Promise<GeneratedReport[]> {
        const reports = await executeQuery<any>(`
            SELECT * FROM generated_reports 
            WHERE generatedBy = ? 
            ORDER BY createdAt DESC
        `, [userId]);

        return reports.map(report => ({
            id: report.id,
            reportType: report.reportType,
            format: report.format,
            generatedBy: report.generatedBy,
            parameters: typeof report.parameters === 'string' 
                ? JSON.parse(report.parameters) 
                : report.parameters,
            status: report.status,
            filePath: report.filePath || '',
            fileSize: report.fileSize || 0,
            downloadCount: report.downloadCount,
            errorMessage: report.errorMessage,
            generatedAt: report.createdAt,
            updatedAt: report.updatedAt,
            contestId: report.contestId || 0
        } as GeneratedReport));
    }

    async incrementDownloadCount(reportId: string): Promise<void> {
        await executeQuery(`
            UPDATE generated_reports 
            SET downloadCount = downloadCount + 1, updatedAt = ?
            WHERE id = ?
        `, [new Date(), reportId]);
    }
}
