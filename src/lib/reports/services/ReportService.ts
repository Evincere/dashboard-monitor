import { executeQuery, executeQuerySingle } from '../../db/mysql';
import { reportStorage } from '../utils/storage';
import { GeneratedReport, ReportRequest } from '../types';
import { ReportGeneratorFactory } from '../generators/ReportGeneratorFactory';
import { ReportConverter } from '../utils/converter';
import { v4 as uuidv4 } from 'uuid';

export class ReportService {
    constructor() {}

    async generateReport(request: ReportRequest, userId: string): Promise<GeneratedReport> {
        // Crear el registro inicial del reporte
        const reportId = uuidv4();
        const now = new Date();
        
        await executeQuery(`
            INSERT INTO generated_reports (
                id, report_type, format, generated_by, parameters, 
                contest_id, status, generated_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            reportId,
            request.type,
            request.format,
            userId,
            JSON.stringify(request.filters || {}),
            request.filters?.contestId || null,
            'GENERATING',
            now,
            now
        ]);

        const report: GeneratedReport = {
            id: reportId,
            reportType: request.type,
            format: request.format,
            generatedBy: userId,
            parameters: request.filters || {},
            contestId: request.filters?.contestId || 0,
            status: 'GENERATING',
            filePath: '', // Will be set when report is completed
            fileSize: 0, // Will be set when report is completed
            downloadCount: 0,
            generatedAt: now,
            updatedAt: now
        } as GeneratedReport;

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
            await executeQuery(`
                UPDATE generated_reports 
                SET status = ?, file_size = ?, file_path = ?, updated_at = ?
                WHERE id = ?
            `, ['COMPLETED', fileSize, reportStorage.getFilePath(report.id, report.format), new Date(), report.id]);

            const updatedReport = await this.getReport(report.id);
            return updatedReport!;
        } catch (error: any) {
            // En caso de error, actualizamos el estado
            await executeQuery(`
                UPDATE generated_reports 
                SET status = ?, error_message = ?, updated_at = ?
                WHERE id = ?
            `, ['FAILED', error.message || 'Unknown error occurred', new Date(), report.id]);
            
            throw error;
        }
    }

    async getReport(reportId: string): Promise<GeneratedReport | null> {
        const report = await executeQuerySingle<any>(`
            SELECT * FROM generated_reports WHERE id = ?
        `, [reportId]);

        if (!report) return null;

        return {
            id: report.id,
            reportType: report.report_type,
            format: report.format,
            generatedBy: report.generated_by,
            parameters: typeof report.parameters === 'string' 
                ? JSON.parse(report.parameters) 
                : report.parameters,
            contestId: report.contest_id,
            status: report.status,
            filePath: report.file_path,
            fileSize: report.file_size,
            downloadCount: report.download_count || 0,
            errorMessage: report.error_message,
            generatedAt: report.generated_at,
            updatedAt: report.updated_at,
            expiresAt: report.expires_at
        } as GeneratedReport;
    }

    async listReports(userId: string, limit = 10, offset = 0): Promise<GeneratedReport[]> {
        const reports = await executeQuery<any>(`
            SELECT * FROM generated_reports 
            WHERE generated_by = ? 
            ORDER BY generated_at DESC 
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);

        return reports.map(report => ({
            id: report.id,
            reportType: report.report_type,
            format: report.format,
            generatedBy: report.generated_by,
            parameters: typeof report.parameters === 'string' 
                ? JSON.parse(report.parameters) 
                : report.parameters,
            contestId: report.contest_id,
            status: report.status,
            filePath: report.file_path,
            fileSize: report.file_size,
            downloadCount: report.download_count || 0,
            errorMessage: report.error_message,
            generatedAt: report.generated_at,
            updatedAt: report.updated_at,
            expiresAt: report.expires_at
        } as GeneratedReport));
    }

    async downloadReport(reportId: string): Promise<{ content: Buffer; format: string }> {
        const report = await this.getReport(reportId);
        if (!report || !report.filePath) {
            throw new Error('Report not found or file not available');
        }

        // Incrementar el contador de descargas
        await executeQuery(`
            UPDATE generated_reports 
            SET download_count = COALESCE(download_count, 0) + 1, updated_at = ?
            WHERE id = ?
        `, [new Date(), reportId]);

        const content = await reportStorage.getReportContent(report.filePath);
        return { content, format: report.format.toLowerCase() };
    }

    async cleanupExpiredReports(): Promise<void> {
        const expiredReports = await executeQuery<any>(`
            SELECT * FROM generated_reports 
            WHERE expires_at <= ? AND status = 'COMPLETED'
        `, [new Date()]);

        for (const report of expiredReports) {
            if (report.file_path) {
                await reportStorage.deleteReport(report.file_path);
            }
            await executeQuery(`
                DELETE FROM generated_reports WHERE id = ?
            `, [report.id]);
        }
    }
}
