import { join } from 'path';
import fs from 'fs/promises';
import { ReportFormat } from '../types';

export class ReportStorage {
    private readonly baseDir: string;

    constructor() {
        this.baseDir = process.env.REPORT_STORAGE_PATH || './storage/reports';
    }

    async init(): Promise<void> {
        await fs.mkdir(this.baseDir, { recursive: true });
    }

    getFilePath(reportId: string, format: ReportFormat): string {
        return join(this.baseDir, `${reportId}.${format.toLowerCase()}`);
    }

    async saveReport(reportId: string, format: ReportFormat, content: Buffer): Promise<string> {
        const filePath = this.getFilePath(reportId, format);
        await fs.writeFile(filePath, content);
        return filePath;
    }

    async deleteReport(filePath: string): Promise<void> {
        await fs.unlink(filePath);
    }

    async getReportContent(filePath: string): Promise<Buffer> {
        return fs.readFile(filePath);
    }

    async cleanExpiredReports(): Promise<void> {
        // TODO: Implementar limpieza de reportes expirados
    }
}

export const reportStorage = new ReportStorage();
