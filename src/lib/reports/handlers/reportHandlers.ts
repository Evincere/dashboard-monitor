import { ReportService } from '../services/ReportService';
import { ReportRequest, ReportFormat } from '../types';
import { NextApiRequest, NextApiResponse } from 'next';

const reportService = new ReportService();

export async function generateReportHandler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const userId = req.headers['x-user-id'];
        if (!userId || Array.isArray(userId)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const request = req.body as ReportRequest;
        const report = await reportService.generateReport(request, userId);
        res.status(200).json(report);
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
}

export async function getReportHandler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { reportId } = req.query;
        if (!reportId || Array.isArray(reportId)) {
            return res.status(400).json({ error: 'Invalid report ID' });
        }

        const report = await reportService.getReport(reportId);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        res.status(200).json(report);
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({ error: 'Failed to fetch report' });
    }
}

export async function listReportsHandler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const userId = req.headers['x-user-id'];
        if (!userId || Array.isArray(userId)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const limit = Number(req.query.limit) || 10;
        const offset = Number(req.query.offset) || 0;

        const reports = await reportService.listReports(userId, limit, offset);
        res.status(200).json(reports);
    } catch (error) {
        console.error('Error listing reports:', error);
        res.status(500).json({ error: 'Failed to list reports' });
    }
}

export async function downloadReportHandler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { reportId } = req.query;
        if (!reportId || Array.isArray(reportId)) {
            return res.status(400).json({ error: 'Invalid report ID' });
        }

        const { content, format } = await reportService.downloadReport(reportId);

        const contentTypes: { [K in ReportFormat]: string } = {
            PDF: 'application/pdf',
            EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            CSV: 'text/csv',
            JSON: 'application/json'
        };

        res.setHeader('Content-Type', contentTypes[format as ReportFormat] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.${format}"`);
        res.status(200).send(content);
    } catch (error) {
        console.error('Error downloading report:', error);
        res.status(500).json({ error: 'Failed to download report' });
    }
}
