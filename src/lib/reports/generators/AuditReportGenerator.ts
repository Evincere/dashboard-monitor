import { ReportType, AuditReport } from '../types';
import { BaseReportGenerator } from './BaseReportGenerator';

export class AuditReportGenerator extends BaseReportGenerator {
    async generate(contestId?: number): Promise<AuditReport> {
        const documentChanges = await this.getDocumentChanges(contestId);
        const userActions = await this.getUserActions(contestId);
        const validationActions = await this.getValidationActions(contestId);
        const systemEvents = await this.getSystemEvents(contestId);

        return {
            documentChanges,
            userActions,
            validationActions,
            systemEvents,
        };
    }

    private async getDocumentChanges(contestId?: number) {
        try {
            const documents = await this.executeQuery<any>(`
                SELECT 
                    d.*,
                    u.first_name,
                    u.last_name,
                    v.first_name as validator_first_name,
                    v.last_name as validator_last_name
                FROM documents d
                LEFT JOIN user_entity u ON d.user_id = u.id
                LEFT JOIN user_entity v ON d.validator_id = v.id
                WHERE d.updated_at != d.upload_date
                ${contestId ? 'AND d.inscription_id IN (SELECT id FROM inscriptions WHERE contest_id = ?)' : ''}
                ORDER BY d.updated_at DESC
            `, contestId ? [contestId] : []);

            return documents.map(doc => ({
                changeId: `change_${doc.id}`,
                documentId: doc.id.toString(),
                changedBy: doc.validator_first_name ? 
                    `${doc.validator_first_name} ${doc.validator_last_name}` : 'System',
                timestamp: doc.updated_at,
                previousVersion: 'pending',
                newVersion: doc.status
            }));
        } catch (error) {
            console.error('Error getting document changes:', error);
            return [];
        }
    }

    private async getValidationActions(contestId?: number) {
        try {
            const actions = await this.executeQuery<any>(`
                SELECT 
                    d.id,
                    d.validator_id,
                    d.status,
                    d.validation_date,
                    d.rejection_reason,
                    v.first_name,
                    v.last_name
                FROM documents d
                LEFT JOIN user_entity v ON d.validator_id = v.id
                WHERE d.validation_date IS NOT NULL
                ${contestId ? 'AND d.inscription_id IN (SELECT id FROM inscriptions WHERE contest_id = ?)' : ''}
                ORDER BY d.validation_date DESC
            `, contestId ? [contestId] : []);

            return actions.map(action => ({
                actionId: `validation_${action.id}`,
                documentId: action.id.toString(),
                validatorId: action.validator_id?.toString() || 'unknown',
                action: action.status === 'approved' ? 'APPROVE' as const : 'REJECT' as const,
                timestamp: action.validation_date,
                comments: action.rejection_reason || undefined
            }));
        } catch (error) {
            console.error('Error getting validation actions:', error);
            return [];
        }
    }

    private async getSystemEvents(contestId?: number) {
        try {
            const events = await this.executeQuery<any>(`
                SELECT 
                    id,
                    event_type,
                    severity,
                    description,
                    created_at
                FROM system_events
                ${contestId ? 'WHERE contest_id = ?' : ''}
                ORDER BY created_at DESC
                LIMIT 100
            `, contestId ? [contestId] : []);

            return events.map(event => ({
                eventId: event.id.toString(),
                eventType: event.event_type,
                details: { description: event.description, severity: event.severity },
                timestamp: event.created_at
            }));
        } catch (error) {
            console.error('Error getting system events:', error);
            return [];
        }
    }


    private async getUserActions(contestId?: number) {
        try {
            const actions = await this.executeQuery<any>(`
                SELECT 
                    al.*,
                    u.first_name,
                    u.last_name
                FROM audit_logs al
                LEFT JOIN user_entity u ON al.user_id = u.id
                ${contestId ? 'WHERE al.contest_id = ?' : ''}
                ORDER BY al.created_at DESC
                LIMIT 1000
            `, contestId ? [contestId] : []);

            return actions.map(action => ({
                actionId: action.id.toString(),
                userId: action.user_id?.toString() || 'unknown',
                userName: action.first_name ? `${action.first_name} ${action.last_name}` : 'Unknown',
                actionType: action.action_type,
                resourceType: action.resource_type,
                resourceId: action.resource_id?.toString(),
                timestamp: action.created_at,
                details: action.description
            }));
        } catch (error) {
            console.error('Error getting user actions:', error);
            return [];
        }
    }
}
