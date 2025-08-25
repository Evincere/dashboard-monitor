import { ReportType, FinalResultsReport } from '../types';
import { BaseReportGenerator } from './BaseReportGenerator';

export class FinalResultsReportGenerator extends BaseReportGenerator {
    async generate(contestId?: number): Promise<FinalResultsReport> {
        const contestInfo = await this.getContestInfo(contestId);
        const totalPostulations = await this.getTotalPostulations(contestId);
        const validationPeriod = await this.getValidationPeriod(contestId);
        const approvedPostulations = await this.getApprovedPostulations(contestId);
        const rejectedPostulations = await this.getRejectedPostulations(contestId);
        const stats = await this.getValidationStats(contestId);

        return {
            metadata: {
                contestTitle: contestInfo.name,
                generatedAt: new Date().toISOString(),
                generatedBy: 'System',
                totalPostulations,
                validationPeriod: {
                    start: validationPeriod.startDate.toISOString(),
                    end: validationPeriod.endDate.toISOString()
                }
            },
            approved: {
                count: approvedPostulations.length,
                postulations: approvedPostulations.map(p => ({
                    userId: p.id.toString(),
                    fullName: p.participantName,
                    dni: p.participantDni,
                    validationDate: p.approvalDate ? p.approvalDate.toISOString() : '',
                    documentsValidated: stats.documentsPerPostulation[p.id] || 0,
                    observations: ''
                }))
            },
            rejected: {
                count: rejectedPostulations.length,
                postulations: rejectedPostulations.map(p => ({
                    userId: p.id.toString(),
                    fullName: p.participantName,
                    dni: p.participantDni,
                    rejectionReason: p.rejectionReason,
                    validationDate: p.rejectionDate ? p.rejectionDate.toISOString() : '',
                    documentsValidated: stats.documentsPerPostulation[p.id] || 0
                })),
                rejectionReasons: stats.rejectionReasons
            },
            summary: {
                approvalRate: (approvedPostulations.length / (approvedPostulations.length + rejectedPostulations.length)) * 100,
                averageValidationTime: stats.averageValidationTime,
                documentsProcessed: stats.totalDocuments
            }
        };
    }

    private async getContestInfo(contestId?: number) {
        try {
            if (!contestId) {
                return { id: 0, name: 'All Contests', description: 'All contests combined' };
            }

            const contest = await this.executeQuerySingle<any>(`
                SELECT id, name, description FROM contests WHERE id = ?
            `, [contestId]);

            return contest || { id: contestId, name: `Contest ${contestId}`, description: '' };
        } catch (error) {
            console.error('Error getting contest info:', error);
            return { id: contestId || 0, name: 'Unknown Contest', description: '' };
        }
    }

    private async getValidationPeriod(contestId?: number) {
        try {
            const firstValidation = await this.executeQuerySingle<{ validation_date: Date }>(`
                SELECT MIN(validation_date) as validation_date
                FROM documents 
                WHERE validation_date IS NOT NULL
                ${contestId ? 'AND inscription_id IN (SELECT id FROM inscriptions WHERE contest_id = ?)' : ''}
            `, contestId ? [contestId] : []);

            const lastValidation = await this.executeQuerySingle<{ validation_date: Date }>(`
                SELECT MAX(validation_date) as validation_date
                FROM documents 
                WHERE validation_date IS NOT NULL
                ${contestId ? 'AND inscription_id IN (SELECT id FROM inscriptions WHERE contest_id = ?)' : ''}
            `, contestId ? [contestId] : []);

            return {
                startDate: firstValidation?.validation_date || new Date(),
                endDate: lastValidation?.validation_date || new Date()
            };
        } catch (error) {
            console.error('Error getting validation period:', error);
            return { startDate: new Date(), endDate: new Date() };
        }
    }

    private async getTotalPostulations(contestId?: number): Promise<number> {
        try {
            const result = await this.executeQuerySingle<{ count: number }>(`
                SELECT COUNT(*) as count FROM inscriptions
                ${contestId ? 'WHERE contest_id = ?' : ''}
            `, contestId ? [contestId] : []);

            return result?.count || 0;
        } catch (error) {
            console.error('Error getting total postulations:', error);
            return 0;
        }
    }

    private async getApprovedPostulations(contestId?: number) {
        try {
            const approvedPostulations = await this.executeQuery<any>(`
                SELECT 
                    i.*,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.dni
                FROM inscriptions i
                JOIN user_entity u ON i.user_id = u.id
                WHERE i.status = 'approved'
                ${contestId ? 'AND i.contest_id = ?' : ''}
                ORDER BY i.inscription_date DESC
            `, contestId ? [contestId] : []);

            return approvedPostulations.map(postulation => ({
                id: postulation.id,
                participantName: `${postulation.first_name} ${postulation.last_name}`,
                participantEmail: postulation.email,
                participantDni: postulation.dni,
                inscriptionDate: postulation.inscription_date,
                approvalDate: postulation.approval_date,
                score: postulation.score || 0
            }));
        } catch (error) {
            console.error('Error getting approved postulations:', error);
            return [];
        }
    }

    private async getRejectedPostulations(contestId?: number) {
        try {
            const rejectedPostulations = await this.executeQuery<any>(`
                SELECT 
                    i.*,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.dni
                FROM inscriptions i
                JOIN user_entity u ON i.user_id = u.id
                WHERE i.status = 'rejected'
                ${contestId ? 'AND i.contest_id = ?' : ''}
                ORDER BY i.inscription_date DESC
            `, contestId ? [contestId] : []);

            return rejectedPostulations.map(postulation => ({
                id: postulation.id,
                participantName: `${postulation.first_name} ${postulation.last_name}`,
                participantEmail: postulation.email,
                participantDni: postulation.dni,
                inscriptionDate: postulation.inscription_date,
                rejectionDate: postulation.rejection_date,
                rejectionReason: postulation.rejection_reason || 'No reason specified'
            }));
        } catch (error) {
            console.error('Error getting rejected postulations:', error);
            return [];
        }
    }

    private async getValidationStats(contestId?: number) {
        try {
            // Get average validation time and total documents
            const statsQuery = await this.executeQuerySingle<{ avg_time: number, total_docs: number }>(`
                SELECT 
                    AVG(TIMESTAMPDIFF(SECOND, submitted_at, validated_at)) as avg_time,
                    COUNT(*) as total_docs
                FROM documents
                WHERE validated_at IS NOT NULL
                ${contestId ? 'AND inscription_id IN (SELECT id FROM inscriptions WHERE contest_id = ?)' : ''}
            `, contestId ? [contestId] : []);

            // Get documents per postulation
            const docsPerPostulation = await this.executeQuery<{ inscription_id: number, doc_count: number }>(`
                SELECT inscription_id, COUNT(*) as doc_count
                FROM documents
                WHERE validated_at IS NOT NULL
                ${contestId ? 'AND inscription_id IN (SELECT id FROM inscriptions WHERE contest_id = ?)' : ''}
                GROUP BY inscription_id
            `, contestId ? [contestId] : []);

            // Get rejection reasons summary
            const rejectionReasons = await this.executeQuery<{ reason: string, count: number }>(`
                SELECT rejection_reason as reason, COUNT(*) as count
                FROM inscriptions
                WHERE status = 'rejected'
                ${contestId ? 'AND contest_id = ?' : ''}
                GROUP BY rejection_reason
            `, contestId ? [contestId] : []);

            const totalRejections = rejectionReasons.reduce((sum, r) => sum + r.count, 0);

            return {
                averageValidationTime: statsQuery?.avg_time || 0,
                totalDocuments: statsQuery?.total_docs || 0,
                documentsPerPostulation: Object.fromEntries(
                    docsPerPostulation.map(d => [d.inscription_id, d.doc_count])
                ),
                rejectionReasons: rejectionReasons.map(r => ({
                    reason: r.reason || 'No reason specified',
                    count: r.count,
                    percentage: totalRejections > 0 ? (r.count / totalRejections) * 100 : 0
                }))
            };
        } catch (error) {
            console.error('Error getting validation stats:', error);
            return {
                averageValidationTime: 0,
                totalDocuments: 0,
                documentsPerPostulation: {},
                rejectionReasons: []
            };
        }
    }
}
