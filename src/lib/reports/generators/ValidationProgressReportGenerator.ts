import { ReportType, ValidationProgressReport } from '../types';
import { PrismaClient } from '@prisma/client';
import { ValidationStats, DocumentStatusCount, ValidationOverview, DocumentTypeMetrics } from '../types/validation';
import { ValidatorMetric, ValidatorUser, DocumentMetric, DocumentTypeInfo } from '../types/metrics';

export class ValidationProgressReportGenerator {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async generate(contestId?: number): Promise<ValidationProgressReport> {
        // TODO: Implementar la lógica real de generación del reporte
        // Este es un ejemplo básico de la estructura

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

    private async getOverview(contestId?: number) {
        const [totalPostulations, validations] = await Promise.all([
            this.prisma.inscription.count({
                where: contestId ? { contestId: contestId } : {}
            }),
            this.prisma.document.groupBy({
                by: ['status'],
                where: {
                    inscription: {
                        contestId: contestId || undefined
                    }
                },
                _count: true
            })
        ]);

        const validationStats: ValidationStats = validations.reduce((acc: ValidationStats, curr: DocumentStatusCount) => {
            switch (curr.status) {
                case 'VALIDATED':
                    acc.validationCompleted += curr._count;
                    break;
                case 'PENDING':
                    acc.validationPending += curr._count;
                    break;
                case 'IN_REVIEW':
                    acc.validationInProgress += curr._count;
                    break;
            }
            return acc;
        }, {
            validationCompleted: 0,
            validationPending: 0,
            validationInProgress: 0
        });

        return {
            totalPostulations,
            ...validationStats
        };
    }

    private async getValidatorMetrics(contestId?: number) {
        const validatorMetrics = await this.prisma.document.groupBy({
            by: ['validatorId'],
            where: {
                inscription: {
                    contestId: contestId || undefined
                },
                status: 'VALIDATED'
            },
            _count: true,
            _avg: {
                validationTime: true
            }
        });

        const validatorIds = validatorMetrics.map((m: ValidatorMetric) => m.validatorId).filter(Boolean);
        const validators = await this.prisma.user.findMany({
            where: {
                id: {
                    in: validatorIds as string[]
                }
            },
            select: {
                id: true,
                name: true,
                lastName: true
            }
        });

        return validatorMetrics.map((metric: ValidatorMetric) => {
            const validator = validators.find((v: ValidatorUser) => v.id === metric.validatorId);
            return {
                validatorId: metric.validatorId || '',
                validatorName: validator ? `${validator.name} ${validator.lastName}` : 'Sistema',
                validatedCount: metric._count,
                averageValidationTime: metric._avg?.validationTime || 0
            };
        });
    }

    private async getDocumentTypeMetrics(contestId?: number) {
        // Get document type metrics
        const metrics = await this.prisma.document.groupBy({
            by: ['documentTypeId', 'status'],
            where: {
                inscription: {
                    contestId: contestId || undefined
                },
                status: {
                    in: ['APPROVED', 'REJECTED']
                }
            },
            _count: true,
        }) as DocumentMetric[];

        // Get document type information
        const documentTypes = await this.prisma.documentType.findMany({
            where: {
                id: {
                    in: [...new Set(metrics.map(m => m.documentTypeId))]
                }
            },
            select: {
                id: true,
                name: true
            }
        }) as DocumentTypeInfo[];

        // Process and aggregate metrics
        const metricsMap = metrics.reduce((acc: Record<number, { approved: number; rejected: number }>, metric) => {
            if (!acc[metric.documentTypeId]) {
                acc[metric.documentTypeId] = { approved: 0, rejected: 0 };
            }

            if (metric.status === 'APPROVED') {
                acc[metric.documentTypeId].approved = metric._count;
            } else if (metric.status === 'REJECTED') {
                acc[metric.documentTypeId].rejected = metric._count;
            }

            return acc;
        }, {});

        // Format final results
        return documentTypes.map(docType => ({
            documentType: docType.name,
            approved: metricsMap[docType.id]?.approved || 0,
            rejected: metricsMap[docType.id]?.rejected || 0,
            pending: 0 // Since we're not currently tracking pending documents
        }));
    }

    private async getTimelineData(contestId?: number) {
        // Get validations by date
        const dailyValidations = await this.prisma.$queryRaw`
            SELECT 
                DATE(validatedAt) as date,
                COUNT(*) as validationsCount,
                SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as approvalRate,
                COUNT(DISTINCT validatorId) as validatorCount
            FROM document
            WHERE validatedAt IS NOT NULL
            ${contestId ? this.prisma.Prisma.sql`AND inscriptionId IN (
                SELECT id FROM inscription WHERE contestId = ${contestId}
            )` : this.prisma.Prisma.empty}
            GROUP BY DATE(validatedAt)
            ORDER BY date ASC
        ` as Array<{
            date: Date;
            validationsCount: number;
            approvalRate: number;
            validatorCount: number;
        }>;

        return dailyValidations.map(day => ({
            date: day.date.toISOString().split('T')[0],
            validationsCount: Number(day.validationsCount),
            approvalRate: Number(day.approvalRate),
            validatorCount: Number(day.validatorCount),
            validatedCount: Number(day.validationsCount), // Same as validationsCount for backward compatibility
            approvedCount: Math.round(Number(day.validationsCount) * Number(day.approvalRate) / 100),
            rejectedCount: Math.round(Number(day.validationsCount) * (100 - Number(day.approvalRate)) / 100)
        }));
    }
}
