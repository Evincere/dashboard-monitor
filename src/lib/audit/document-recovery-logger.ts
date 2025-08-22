import fs from 'fs/promises';
import path from 'path';

export interface DocumentRecoveryEvent {
  timestamp: string;
  documentId: string;
  userDni: string;
  userName?: string;
  expectedFileName: string;
  expectedDocumentType: string;
  searchPaths: string[];
  recoveryType: 'EXACT_MATCH' | 'RECOVERED_BY_SIMILARITY' | 'NOT_FOUND' | 'PLACEHOLDER_GENERATED';
  recoveredDocument?: {
    id: string;
    fileName: string;
    fullPath: string;
    documentType: string;
  };
  similarDocumentsFound: number;
  administratorAction?: string;
  sessionId?: string;
  adminUser?: string;
}

export class DocumentRecoveryLogger {
  private static readonly LOG_DIR = process.env.DOCUMENT_RECOVERY_LOG_DIR || '/tmp/document-recovery-logs';
  private static readonly MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_LOG_FILES = 10;

  /**
   * Inicializa el sistema de logging (crear directorio si no existe)
   */
  static async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.LOG_DIR, { recursive: true });
    } catch (error) {
      console.error('❌ [RECOVERY_LOGGER] Failed to create log directory:', error);
    }
  }

  /**
   * Registra un evento de recuperación de documento
   */
  static async logRecoveryEvent(event: DocumentRecoveryEvent): Promise<void> {
    try {
      await this.initialize();
      
      const logFileName = `document-recovery-${new Date().toISOString().split('T')[0]}.log`;
      const logFilePath = path.join(this.LOG_DIR, logFileName);
      
      const logEntry = this.formatLogEntry(event);
      
      // Escribir al archivo de log
      await fs.appendFile(logFilePath, logEntry + '\n', 'utf8');
      
      // Rotar logs si es necesario
      await this.rotateLogsIfNeeded(logFilePath);
      
      // También logear a consola para debugging
      console.log(`📋 [RECOVERY_LOGGER] ${event.recoveryType}: User ${event.userDni}, Doc ${event.documentId}`);
      
    } catch (error) {
      console.error('❌ [RECOVERY_LOGGER] Failed to write log entry:', error);
    }
  }

  /**
   * Formatea una entrada de log como JSON estructurado
   */
  private static formatLogEntry(event: DocumentRecoveryEvent): string {
    return JSON.stringify({
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    }, null, 0); // Sin espacios para ahorrar espacio en disco
  }

  /**
   * Rota los archivos de log si superan el tamaño máximo
   */
  private static async rotateLogsIfNeeded(logFilePath: string): Promise<void> {
    try {
      const stats = await fs.stat(logFilePath);
      
      if (stats.size > this.MAX_LOG_SIZE) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = `${logFilePath}.${timestamp}`;
        
        await fs.rename(logFilePath, rotatedPath);
        
        // Limpiar logs antiguos
        await this.cleanOldLogs();
      }
    } catch (error) {
      console.warn('⚠️ [RECOVERY_LOGGER] Failed to rotate logs:', error);
    }
  }

  /**
   * Limpia logs antiguos manteniendo solo los más recientes
   */
  private static async cleanOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.LOG_DIR);
      const logFiles = files
        .filter(file => file.startsWith('document-recovery-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.LOG_DIR, file)
        }));

      if (logFiles.length > this.MAX_LOG_FILES) {
        // Obtener estadísticas de todos los archivos
        const filesWithStats = await Promise.all(
          logFiles.map(async (file) => {
            const stats = await fs.stat(file.path);
            return { ...file, mtime: stats.mtime };
          })
        );

        // Ordenar por fecha de modificación (más antiguos primero)
        filesWithStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

        // Eliminar archivos más antiguos
        const filesToDelete = filesWithStats.slice(0, filesWithStats.length - this.MAX_LOG_FILES);
        
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
          console.log(`🗑️ [RECOVERY_LOGGER] Deleted old log file: ${file.name}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ [RECOVERY_LOGGER] Failed to clean old logs:', error);
    }
  }

  /**
   * Obtiene estadísticas de recuperación de documentos
   */
  static async getRecoveryStats(days: number = 7): Promise<{
    totalEvents: number;
    exactMatches: number;
    recoveredBySimilarity: number;
    notFound: number;
    placeholdersGenerated: number;
    topAffectedUsers: { userDni: string; events: number }[];
    topMissingDocumentTypes: { documentType: string; count: number }[];
  }> {
    try {
      await this.initialize();
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const files = await fs.readdir(this.LOG_DIR);
      const logFiles = files.filter(file => 
        file.startsWith('document-recovery-') && file.endsWith('.log')
      );

      const events: DocumentRecoveryEvent[] = [];
      
      for (const logFile of logFiles) {
        const logPath = path.join(this.LOG_DIR, logFile);
        const content = await fs.readFile(logPath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const event: DocumentRecoveryEvent = JSON.parse(line);
            const eventDate = new Date(event.timestamp);
            
            if (eventDate >= cutoffDate) {
              events.push(event);
            }
          } catch (parseError) {
            // Skip malformed log entries
            continue;
          }
        }
      }

      // Calcular estadísticas
      const stats = {
        totalEvents: events.length,
        exactMatches: events.filter(e => e.recoveryType === 'EXACT_MATCH').length,
        recoveredBySimilarity: events.filter(e => e.recoveryType === 'RECOVERED_BY_SIMILARITY').length,
        notFound: events.filter(e => e.recoveryType === 'NOT_FOUND').length,
        placeholdersGenerated: events.filter(e => e.recoveryType === 'PLACEHOLDER_GENERATED').length,
        topAffectedUsers: this.getTopAffectedUsers(events, 10),
        topMissingDocumentTypes: this.getTopMissingDocumentTypes(events, 10)
      };

      return stats;
      
    } catch (error) {
      console.error('❌ [RECOVERY_LOGGER] Failed to get recovery stats:', error);
      return {
        totalEvents: 0,
        exactMatches: 0,
        recoveredBySimilarity: 0,
        notFound: 0,
        placeholdersGenerated: 0,
        topAffectedUsers: [],
        topMissingDocumentTypes: []
      };
    }
  }

  /**
   * Obtiene los usuarios más afectados por problemas de documentos
   */
  private static getTopAffectedUsers(
    events: DocumentRecoveryEvent[], 
    limit: number
  ): { userDni: string; events: number }[] {
    const userCounts: { [dni: string]: number } = {};
    
    events.forEach(event => {
      if (event.recoveryType === 'NOT_FOUND' || event.recoveryType === 'PLACEHOLDER_GENERATED') {
        userCounts[event.userDni] = (userCounts[event.userDni] || 0) + 1;
      }
    });

    return Object.entries(userCounts)
      .map(([userDni, count]) => ({ userDni, events: count }))
      .sort((a, b) => b.events - a.events)
      .slice(0, limit);
  }

  /**
   * Obtiene los tipos de documentos más problemáticos
   */
  private static getTopMissingDocumentTypes(
    events: DocumentRecoveryEvent[], 
    limit: number
  ): { documentType: string; count: number }[] {
    const typeCounts: { [type: string]: number } = {};
    
    events.forEach(event => {
      if (event.recoveryType === 'NOT_FOUND' || event.recoveryType === 'PLACEHOLDER_GENERATED') {
        typeCounts[event.expectedDocumentType] = (typeCounts[event.expectedDocumentType] || 0) + 1;
      }
    });

    return Object.entries(typeCounts)
      .map(([documentType, count]) => ({ documentType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Obtiene eventos de recuperación para un usuario específico
   */
  static async getUserRecoveryHistory(userDni: string, days: number = 30): Promise<DocumentRecoveryEvent[]> {
    try {
      const allStats = await this.getRecoveryStats(days);
      // Esta es una implementación simplificada. En una implementación completa,
      // cargaríamos todos los eventos y filtrar por usuario específico
      return []; // TODO: Implementar carga completa de eventos por usuario
    } catch (error) {
      console.error('❌ [RECOVERY_LOGGER] Failed to get user recovery history:', error);
      return [];
    }
  }
}
