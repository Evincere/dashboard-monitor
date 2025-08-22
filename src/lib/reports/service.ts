import { GeneratedReport, ReportRequest } from './types';
import prisma from '../db';

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
        return await prisma.generatedReport.create({
            data: {
                reportType: request.type,
                format: request.format,
                generatedBy: userId,
                parameters: request.filters || {},
                status: 'GENERATING',
                downloadCount: 0
            }
        });
    }

    async updateReportStatus(
        reportId: string,
        status: 'COMPLETED' | 'FAILED',
        filePath?: string,
        fileSize?: number,
        errorMessage?: string
    ): Promise<GeneratedReport> {
        return await prisma.generatedReport.update({
            where: { id: reportId },
            data: {
                status,
                filePath,
                fileSize,
                errorMessage
            }
        });
    }

    async getReport(reportId: string): Promise<GeneratedReport | null> {
        return await prisma.generatedReport.findUnique({
            where: { id: reportId }
        });
    }

    async getReportHistory(userId: string): Promise<GeneratedReport[]> {
        return await prisma.generatedReport.findMany({
            where: { generatedBy: userId },
            orderBy: { generatedAt: 'desc' }
        });
    }

    async incrementDownloadCount(reportId: string): Promise<void> {
        await prisma.generatedReport.update({
            where: { id: reportId },
            data: {
                downloadCount: {
                    increment: 1
                }
            }
        });
    }
}
