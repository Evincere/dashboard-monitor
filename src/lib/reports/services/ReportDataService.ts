// ================================================
// SERVICIO PRINCIPAL DE DATOS - SISTEMA REPORTES
// ================================================

import mysql from 'mysql2/promise';
import type {
  ReportFilter,
  DashboardMetrics,
  TechnicalIssue,
  DailyProgressPoint,
  DocumentStatus,
  TechnicalIssueType
} from '../types/index';

export class ReportDataService {
  private connection: mysql.Connection;

  constructor(connection: mysql.Connection) {
    this.connection = connection;
  }

  // =====================================
  // MÉTRICAS PRINCIPALES DEL DASHBOARD
  // =====================================

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      // KPIs básicos - una consulta optimizada
      const [kpiRows] = await this.connection.execute(`
        SELECT 
          (SELECT COUNT(DISTINCT user_id) FROM inscriptions) as totalUsers,
          COUNT(*) as totalDocuments,
          COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as documentsApproved,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as documentsPending,
          COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as documentsRejected,
          AVG(CASE WHEN status != 'PENDING' 
              THEN TIMESTAMPDIFF(MINUTE, upload_date, NOW()) 
              END) as avgProcessingTime
        FROM documents
      `);

      const kpi = (kpiRows as any[])[0];

      // Detectar problemas técnicos
      const [techIssuesRows] = await this.connection.execute(`
        SELECT COUNT(*) as technicalIssues
        FROM documents 
        WHERE status = 'REJECTED' 
        AND (
          rejection_reason LIKE '%corrupto%' OR
          rejection_reason LIKE '%archivo%' OR
          rejection_reason LIKE '%error%' OR
          rejection_reason LIKE '%sistema%'
        )
      `);

      const techIssuesCount = (techIssuesRows as any[])[0].technicalIssues || 0;
      const processingProgress = Math.round((kpi.documentsApproved / kpi.totalDocuments) * 100);

      // Progreso diario (últimos 30 días)
      const dailyProgress = await this.getDailyProgress();

      return {
        totalUsers: kpi.totalUsers,
        totalDocuments: kpi.totalDocuments,
        processingProgress,
        averageProcessingTime: Math.round(kpi.avgProcessingTime || 0),
        documentsApproved: kpi.documentsApproved,
        documentsPending: kpi.documentsPending,
        documentsRejected: kpi.documentsRejected,
        documentsWithTechnicalIssues: techIssuesCount,
        statusDistribution: {
          approved: kpi.documentsApproved,
          pending: kpi.documentsPending,
          rejected: kpi.documentsRejected,
          technicalIssues: techIssuesCount
        },
        dailyProgress
      };

    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      throw new Error('Failed to fetch dashboard metrics');
    }
  }

  // =====================================
  // PROGRESO DIARIO (ÚLTIMOS 30 DÍAS)
  // =====================================

  private async getDailyProgress(): Promise<DailyProgressPoint[]> {
    try {
      const [rows] = await this.connection.execute(`
        SELECT 
          DATE(upload_date) as date,
          COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected
        FROM documents
        WHERE upload_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(upload_date)
        ORDER BY date DESC
        LIMIT 30
      `);

      return (rows as any[]).map(row => ({
        date: row.date.toISOString().split('T')[0],
        approved: row.approved,
        pending: row.pending,
        rejected: row.rejected
      }));

    } catch (error) {
      console.error('Error getting daily progress:', error);
      return [];
    }
  }

  // =====================================
  // DETECCIÓN DE PROBLEMAS TÉCNICOS
  // =====================================

  async getTechnicalIssues(filters?: ReportFilter): Promise<TechnicalIssue[]> {
    try {
      let whereClause = `
        WHERE d.status = 'REJECTED' 
        AND (
          d.rejection_reason LIKE '%corrupto%' OR
          d.rejection_reason LIKE '%archivo%' OR  
          d.rejection_reason LIKE '%error%' OR
          d.rejection_reason LIKE '%sistema%'
        )
      `;

      const params: any[] = [];

      if (filters?.dateRange) {
        whereClause += ' AND d.upload_date BETWEEN ? AND ?';
        params.push(filters.dateRange.from, filters.dateRange.to);
      }

      const [rows] = await this.connection.execute(`
        SELECT 
          d.id as documentId,
          d.user_id as userId,
          u.dni as userDni,
          CONCAT(u.first_name, ' ', u.last_name) as userName,
          d.rejection_reason as description,
          d.upload_date as detectedAt
        FROM documents d
        JOIN user_entity u ON d.user_id = u.id
        ${whereClause}
        ORDER BY d.upload_date DESC
        LIMIT 100
      `, params);

      return (rows as any[]).map(row => ({
        documentId: row.documentId,
        userId: row.userId,
        userDni: row.userDni,
        userName: row.userName,
        issueType: this.classifyIssueType(row.description),
        description: row.description,
        severity: this.determineSeverity(row.description),
        isUserFault: false, // Todos estos son problemas técnicos
        isRecoverable: this.isRecoverable(row.description),
        detectedAt: row.detectedAt,
        suggestedAction: this.getSuggestedAction(row.description)
      }));

    } catch (error) {
      console.error('Error getting technical issues:', error);
      throw new Error('Failed to fetch technical issues');
    }
  }

  // =====================================
  // UTILIDADES DE CLASIFICACIÓN
  // =====================================

  private classifyIssueType(description: string): TechnicalIssueType {
    const desc = description.toLowerCase();

    if (desc.includes('corrupto') || desc.includes('dañado')) return 'FILE_CORRUPTION';
    if (desc.includes('carga') || desc.includes('upload')) return 'UPLOAD_FAILED';
    if (desc.includes('formato')) return 'FORMAT_ERROR';
    if (desc.includes('tamaño') || desc.includes('size')) return 'SIZE_EXCEEDED';
    if (desc.includes('sistema') || desc.includes('server')) return 'SYSTEM_ERROR';

    return 'SYSTEM_ERROR'; // Default
  }

  private determineSeverity(description: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const desc = description.toLowerCase();

    if (desc.includes('corrupto') || desc.includes('sistema')) return 'HIGH';
    if (desc.includes('formato') || desc.includes('tamaño')) return 'MEDIUM';

    return 'LOW';
  }

  private isRecoverable(description: string): boolean {
    const desc = description.toLowerCase();

    // No recuperables: corrupción severa
    if (desc.includes('corrupto') && desc.includes('irreparable')) return false;

    // Recuperables: la mayoría de problemas técnicos
    return true;
  }

  private getSuggestedAction(description: string): string {
    const desc = description.toLowerCase();

    if (desc.includes('corrupto')) return 'Solicitar nueva carga del documento';
    if (desc.includes('formato')) return 'Convertir a formato válido automáticamente';
    if (desc.includes('tamaño')) return 'Comprimir archivo automáticamente';
    if (desc.includes('carga')) return 'Reintento automático de carga';

    return 'Revisar manualmente y aplicar corrección técnica';
  }
}
