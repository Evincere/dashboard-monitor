import { ReportType, ValidationProgressReport, ValidatorMetrics, DocumentTypeMetrics, ValidationTimelinePoint } from '../types';
import { BaseReportGenerator } from './BaseReportGenerator';

interface DocumentCount {
    status: string;
    count: number;
}

interface ValidatorMetricResult {
    validatorId: string;
    validatorName: string;
    validatedCount: number;
    averageValidationTime: number;
}

interface DocumentTypeMetricResult {
    documentType: string;
    approved: number;
    rejected: number;
    pending: number;
}

interface TimelineDataResult {
    date: string;
    validatedCount: number;
    approvedCount: number;
    rejectedCount: number;
}

export class ValidationProgressReportGenerator extends BaseReportGenerator {
    async generate(contestId?: number): Promise<ValidationProgressReport> {
        const overview = await this.getOverview(contestId);
        const byValidator = await this.getValidatorMetrics(contestId);
        const byDocumentType = await this.getDocumentTypeMetrics(contestId);
        const timelineData = await this.getTimelineData(contestId);

        return {
            overview,
            byValidator,
            byDocumentType,
            timelineData
        };
    }

    private async getOverview(contestId?: number): Promise<ValidationProgressReport['overview']> {
        try {
            const totalPostulations = await this.executeQuerySingle<{ count: number }>(`
                SELECT COUNT(*) as count FROM inscriptions
                ${contestId ? 'WHERE contest_id = ?' : ''}
            `, contestId ? [contestId] : []);

            const documentStats = await this.executeQuery<DocumentCount>(`
                SELECT status, COUNT(*) as count
                FROM documents 
                ${contestId ? 'WHERE inscription_id IN (SELECT id FROM inscriptions WHERE contest_id = ?)' : ''}
                GROUP BY status
            `, contestId ? [contestId] : []);

            return {
                totalPostulations: totalPostulations?.count || 0,
                validationCompleted: documentStats.find(s => s.status === 'APPROVED')?.count || 0,
                validationPending: documentStats.find(s => s.status === 'PENDING')?.count || 0,
                validationInProgress: documentStats.find(s => s.status === 'IN_PROGRESS')?.count || 0
            };
        } catch (error) {
            console.error('Error getting overview:', error);
            return {
                totalPostulations: 0,
                validationCompleted: 0,
                validationPending: 0,
                validationInProgress: 0
            };
        }
    }

    private async getValidatorMetrics(contestId?: number): Promise<ValidatorMetrics[]> {
        try {
            const metrics = await this.executeQuery<ValidatorMetricResult>(`
                SELECT 
                    v.id as validatorId,
                    v.name as validatorName,
                    COUNT(d.id) as validatedCount,
                    AVG(TIMESTAMPDIFF(SECOND, d.submitted_at, d.validated_at)) as averageValidationTime
                FROM validators v
                LEFT JOIN documents d ON d.validator_id = v.id
                ${contestId ? 'WHERE d.inscription_id IN (SELECT id FROM inscriptions WHERE contest_id = ?)' : ''}
                GROUP BY v.id, v.name
            `, contestId ? [contestId] : []);

            return metrics.map(m => ({
                validatorId: m.validatorId,
                validatorName: m.validatorName,
                validatedCount: m.validatedCount || 0,
                averageValidationTime: m.averageValidationTime || 0
            }));
        } catch (error) {
            console.error('Error getting validator metrics:', error);
            return [];
        }
    }

    private async getDocumentTypeMetrics(contestId?: number): Promise<DocumentTypeMetrics[]> {
        try {
            const metrics = await this.executeQuery<DocumentTypeMetricResult>(`
                SELECT 
                    dt.id as documentTypeId,
                    dt.name as documentType,
                    SUM(CASE WHEN d.status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN d.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
                    SUM(CASE WHEN d.status = 'PENDING' THEN 1 ELSE 0 END) as pending
                FROM document_types dt
                LEFT JOIN documents d ON d.document_type_id = dt.id
                ${contestId ? 'WHERE d.inscription_id IN (SELECT id FROM inscriptions WHERE contest_id = ?)' : ''}
                GROUP BY dt.id, dt.name
            `, contestId ? [contestId] : []);

            return metrics.map(m => ({
                documentType: m.documentType,
                approved: m.approved || 0,
                rejected: m.rejected || 0,
                pending: m.pending || 0
            }));
        } catch (error) {
            console.error('Error getting document type metrics:', error);
            return [];
        }
    }

    private async getTimelineData(contestId?: number): Promise<ValidationTimelinePoint[]> {
        try {
            const data = await this.executeQuery<TimelineDataResult>(`
                SELECT 
                    DATE(validated_at) as date,
                    COUNT(*) as validatedCount,
                    SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approvedCount,
                    SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejectedCount
                FROM documents
                WHERE validated_at IS NOT NULL
                ${contestId ? 'AND inscription_id IN (SELECT id FROM inscriptions WHERE contest_id = ?)' : ''}
                GROUP BY DATE(validated_at)
                ORDER BY date
            `, contestId ? [contestId] : []);

            return data.map(d => ({
                date: d.date,
                validatedCount: d.validatedCount || 0,
                approvedCount: d.approvedCount || 0,
                rejectedCount: d.rejectedCount || 0
            }));
        } catch (error) {
            console.error('Error getting timeline data:', error);
            return [];
        }
    }
}
