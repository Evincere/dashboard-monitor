import { PrismaClient } from '@prisma/client';
import { reportStorage } from '../utils/storage';
import { GeneratedReport, ReportRequest } from '../types';
import { ReportGeneratorFactory } from '../generators/ReportGeneratorFactory';
import { ReportConverter } from '../utils/converter';

export class ReportService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async generateReport(request: ReportRequest, userId: string): Promise<GeneratedReport> {
        // Crear el registro inicial del reporte
        const report = await this.prisma.generated_reports.create({
            data: {
                reportType: request.type,
                format: request.format,
                generatedBy: userId,
                parameters: request.filters || {},
                contestId: request.filters?.contestId,
                status: 'GENERATING'
            }
        });

        try {
            // Obtener el generador correspondiente
            const generator = ReportGeneratorFactory.getGenerator(request.type);

            // Generar el contenido del reporte
            const reportData = await generator.generate(request.filters?.contestId);

            // Convertir el reporte al formato solicitado
            let content: Buffer;
            switch (request.format) {
                case 'PDF':
                    content = await ReportConverter.toPDF(reportData);
                    break;
                case 'EXCEL':
                    content = await ReportConverter.toExcel(reportData);
                    break;
                case 'CSV':
                    content = await ReportConverter.toCSV(reportData);
                    break;
                case 'JSON':
                    content = Buffer.from(JSON.stringify(reportData));
                    break;
                default:
                    throw new Error(`Unsupported format: ${request.format}`);
            }

            // Guardar el archivo
            const filePath = await reportStorage.saveReport(report.id, request.format, content);
            const fileSize = Buffer.byteLength(content);

            // Actualizar el registro
            return await this.prisma.generated_reports.update({
                where: { id: report.id },
                data: {
                    status: 'COMPLETED',
                    fileSize: 0, // TODO: Actualizar con el tamaño real
                    filePath: reportStorage.getFilePath(report.id, report.format)
                }
            });
        } catch (error: any) {
            // En caso de error, actualizamos el estado
            await this.prisma.generated_reports.update({
                where: { id: report.id },
                data: {
                    status: 'FAILED',
                    errorMessage: error.message || 'Unknown error occurred'
                }
            });
            throw error;
        }
    }

    async getReport(reportId: string): Promise<GeneratedReport | null> {
        return this.prisma.generated_reports.findUnique({
            where: { id: reportId }
        });
    }

    async listReports(userId: string, limit = 10, offset = 0): Promise<GeneratedReport[]> {
        return this.prisma.generated_reports.findMany({
            where: { generatedBy: userId },
            orderBy: { generatedAt: 'desc' },
            take: limit,
            skip: offset
        });
    }

    async downloadReport(reportId: string): Promise<{ content: Buffer; format: string }> {
        const report = await this.getReport(reportId);
        if (!report || !report.filePath) {
            throw new Error('Report not found or file not available');
        }

        // Incrementar el contador de descargas
        await this.prisma.generated_reports.update({
            where: { id: reportId },
            data: { downloadCount: { increment: 1 } }
        });

        const content = await reportStorage.getReportContent(report.filePath);
        return { content, format: report.format.toLowerCase() };
    }

    async cleanupExpiredReports(): Promise<void> {
        const expiredReports = await this.prisma.generated_reports.findMany({
            where: {
                expiresAt: { lte: new Date() },
                status: 'COMPLETED'
            }
        });

        for (const report of expiredReports) {
            if (report.filePath) {
                await reportStorage.deleteReport(report.filePath);
            }
            await this.prisma.generated_reports.delete({
                where: { id: report.id }
            });
        }
    }
}
