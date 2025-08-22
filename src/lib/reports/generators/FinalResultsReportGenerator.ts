import { PrismaClient } from '@prisma/client';
import { FinalResultsReport } from '../types';
import { Postulation } from '../types/postulation';

export class FinalResultsReportGenerator {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async generate(contestId?: number): Promise<FinalResultsReport> {
        const metadata = await this.getMetadata(contestId);
        const { approved, rejected } = await this.getPostulationsData(contestId);
        const summary = this.calculateSummary(approved.postulations, rejected.postulations);

        return {
            metadata,
            approved,
            rejected,
            summary
        };
    }

    private async getMetadata(contestId?: number) {
        if (!contestId) {
            throw new Error('Contest ID is required for final results report');
        }

        const contest = await this.prisma.contests.findUnique({
            where: { id: contestId }
        });

        if (!contest) {
            throw new Error('Contest not found');
        }

        const validationPeriod = await this.getValidationPeriod(contestId);
        const totalPostulations = await this.getTotalPostulations(contestId);

        return {
            contestTitle: contest.title || 'Unknown Contest',
            generatedAt: new Date().toISOString(),
            generatedBy: 'System',
            totalPostulations,
            validationPeriod
        };
    }

    private async getValidationPeriod(contestId: number) {
        const firstValidation = await this.prisma.documents.findFirst({
            where: { contestId },
            orderBy: { updatedAt: 'asc' },
            select: { updatedAt: true }
        });

        const lastValidation = await this.prisma.documents.findFirst({
            where: { contestId },
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true }
        });

        return {
            start: firstValidation?.updatedAt?.toISOString() || new Date().toISOString(),
            end: lastValidation?.updatedAt?.toISOString() || new Date().toISOString()
        };
    }

    private async getTotalPostulations(contestId: number): Promise<number> {
        return this.prisma.inscriptions.count({
            where: { contestId }
        });
    }

    private async getPostulationsData(contestId?: number) {
        if (!contestId) {
            throw new Error('Contest ID is required');
        }

        const approvedPostulations = await this.prisma.inscriptions.findMany({
            where: {
                contestId,
                state: 'ADMITIDO'
            },
            include: {
                documents: {
                    include: {
                        document_types: true
                    }
                },
                users: true
            }
        });

        const rejectedPostulations = await this.prisma.inscriptions.findMany({
            where: {
                contestId,
                state: 'NO ADMITIDO'
            },
            include: {
                documents: {
                    include: {
                        document_types: true
                    }
                },
                users: true,
                inscription_notes: true
            }
        });

        // Procesamiento de postulaciones aprobadas
        const approved = {
            count: approvedPostulations.length,
            postulations: approvedPostulations.map((p: Postulation) => ({
                userId: p.userId,
                fullName: `${p.users?.firstName || ''} ${p.users?.lastName || ''}`.trim(),
                dni: p.users?.dni || '',
                validationDate: p.updatedAt?.toISOString() || '',
                documentsValidated: p.documents.length,
                observations: p.observations || ''
            }))
        };

        // Procesamiento de postulaciones rechazadas y razones de rechazo
        const rejectionReasons = new Map<string, number>();
        const rejected = {
            count: rejectedPostulations.length,
            postulations: rejectedPostulations.map((p: Postulation) => {
                const reason = p.inscription_notes?.[0]?.note || 'Sin especificar';
                rejectionReasons.set(reason, (rejectionReasons.get(reason) || 0) + 1);

                return {
                    userId: p.userId,
                    fullName: `${p.users?.firstName || ''} ${p.users?.lastName || ''}`.trim(),
                    dni: p.users?.dni || '',
                    rejectionReason: reason,
                    validationDate: p.updatedAt?.toISOString() || '',
                    documentsValidated: p.documents.length
                };
            }),
            rejectionReasons: Array.from(rejectionReasons.entries()).map(([reason, count]) => ({
                reason,
                count,
                percentage: (count / rejectedPostulations.length) * 100
            }))
        };

        return { approved, rejected };
    }

    private calculateSummary(approved: any[], rejected: any[]) {
        const total = approved.length + rejected.length;
        const approvalRate = total > 0 ? (approved.length / total) * 100 : 0;

        // Calcular tiempo promedio de validación
        const validationTimes = [...approved, ...rejected]
            .map(p => new Date(p.validationDate).getTime())
            .sort((a, b) => a - b);

        const averageValidationTime = validationTimes.length > 1
            ? (validationTimes[validationTimes.length - 1] - validationTimes[0]) / validationTimes.length
            : 0;

        // Contar documentos procesados
        const documentsProcessed = [...approved, ...rejected]
            .reduce((sum, p) => sum + (p.documentsValidated || 0), 0);

        return {
            approvalRate,
            averageValidationTime,
            documentsProcessed
        };
    }
}
