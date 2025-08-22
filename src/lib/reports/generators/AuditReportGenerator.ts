import { PrismaClient } from '@prisma/client';
import { AuditReport, ValidationAction, SystemEvent, DocumentChange, UserAction } from '../types';
import { Document, DocumentAudit, SecurityEvent, AuditLog } from '../types/db';

export class AuditReportGenerator {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async generate(contestId?: number): Promise<AuditReport> {
        const [
            validationActions,
            systemEvents,
            documentChanges,
            userActions
        ] = await Promise.all([
            this.getValidationActions(contestId),
            this.getSystemEvents(contestId),
            this.getDocumentChanges(contestId),
            this.getUserActions(contestId)
        ]);

        return {
            validationActions,
            systemEvents,
            documentChanges,
            userActions
        };
    }

    private async getValidationActions(contestId?: number): Promise<ValidationAction[]> {
        const documents = await this.prisma.documents.findMany({
            where: contestId ? { contestId } : undefined,
            include: {
                document_audit: true
            }
        });

        return documents.flatMap((doc: Document) =>
            doc.document_audit.map((audit: DocumentAudit) => ({
                actionId: audit.id.toString(),
                documentId: doc.id.toString(),
                validatorId: audit.userId,
                action: audit.action as 'APPROVE' | 'REJECT',
                timestamp: audit.createdAt,
                comments: audit.comments || undefined
            }))
        );
    }

    private async getSystemEvents(contestId?: number): Promise<SystemEvent[]> {
        const events = await this.prisma.security_events.findMany({
            where: contestId ? {
                OR: [
                    { metadata: { contains: contestId.toString() } },
                    { details: { contains: contestId.toString() } }
                ]
            } : undefined,
            orderBy: { timestamp: 'asc' }
        });

        return events.map((event: SecurityEvent) => ({
            eventId: event.id.toString(),
            eventType: event.eventType,
            timestamp: event.timestamp,
            details: JSON.parse(event.details || '{}')
        }));
    }

    private async getDocumentChanges(contestId?: number): Promise<DocumentChange[]> {
        const documents = await this.prisma.documents.findMany({
            where: contestId ? { contestId } : undefined,
            include: {
                document_audit: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        return documents.flatMap((doc: Document) => {
            const changes: DocumentChange[] = [];
            const audits = doc.document_audit;

            for (let i = 1; i < audits.length; i++) {
                changes.push({
                    changeId: `${doc.id}-${i}`,
                    documentId: doc.id.toString(),
                    changedBy: audits[i].userId,
                    timestamp: audits[i].createdAt,
                    previousVersion: audits[i - 1].status,
                    newVersion: audits[i].status
                });
            }

            return changes;
        });
    }

    private async getUserActions(contestId?: number): Promise<UserAction[]> {
        const actions = await this.prisma.audit_logs.findMany({
            where: contestId ? {
                OR: [
                    { metadata: { contains: contestId.toString() } },
                    { details: { contains: contestId.toString() } }
                ]
            } : undefined,
            orderBy: { timestamp: 'desc' }
        });

        return actions.map((action: AuditLog) => ({
            actionId: action.id.toString(),
            userId: action.userId,
            actionType: action.action,
            timestamp: action.timestamp,
            details: JSON.parse(action.details || '{}')
        }));
    }
}
