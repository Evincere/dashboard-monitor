import { promises as fs } from 'fs';
import path from 'path';

// Función para auto-detectar y registrar backups automáticos
export async function detectAndRegisterAutoBackups(backupDir: string, metadataFile: string): Promise<void> {
  try {
    // Leer metadata existente
    let metadata: any[] = [];
    try {
      const metadataContent = await fs.readFile(metadataFile, 'utf-8');
      metadata = JSON.parse(metadataContent);
    } catch (error) {
      console.log('Creating new metadata file');
    }
    
    const files = await fs.readdir(backupDir);
    
    // Buscar archivos de backup automático que no están registrados
    const autoBackupPattern = /^(db_backup|files_backup)_(\d{8}_\d{6})\.(sql\.gz|tar\.gz)$/;
    const reportPattern = /^backup_report_(\d{8}_\d{6})\.txt$/;
    
    // Crear mapa de reportes de backup para obtener información adicional
    const reportFiles = files.filter(file => reportPattern.test(file));
    const reportMap = new Map<string, string>();
    
    for (const reportFile of reportFiles) {
      const match = reportFile.match(reportPattern);
      if (match) {
        const timestamp = match[1];
        reportMap.set(timestamp, reportFile);
      }
    }
    
    // Buscar archivos de backup automático
    const autoBackupFiles = files.filter(file => autoBackupPattern.test(file));
    const backupGroups = new Map<string, { db?: string; files?: string; timestamp: string }>();
    
    for (const file of autoBackupFiles) {
      const match = file.match(autoBackupPattern);
      if (match) {
        const type = match[1]; // db_backup or files_backup
        const timestamp = match[2];
        
        if (!backupGroups.has(timestamp)) {
          backupGroups.set(timestamp, { timestamp });
        }
        
        const group = backupGroups.get(timestamp)!;
        if (type === 'db_backup') {
          group.db = file;
        } else if (type === 'files_backup') {
          group.files = file;
        }
      }
    }
    
    // Registrar backups completos que no están en metadata
    let registered = 0;
    for (const [timestamp, group] of backupGroups) {
      const backupId = `auto_backup_${timestamp}`;
      
      // Verificar si ya existe en metadata
      const existingBackup = metadata.find(b => b.id === backupId);
      if (existingBackup) continue;
      
      // Solo registrar si tiene tanto DB como archivos (backup completo)
      if (!group.db || !group.files) continue;
      
      try {
        // Obtener información del backup
        const dbPath = path.join(backupDir, group.db);
        const filesPath = path.join(backupDir, group.files);
        
        const [dbStats, filesStats] = await Promise.all([
          fs.stat(dbPath),
          fs.stat(filesPath)
        ]);
        
        const totalSize = dbStats.size + filesStats.size;
        const backupDate = new Date(
          parseInt(timestamp.substring(0, 4)),
          parseInt(timestamp.substring(4, 6)) - 1,
          parseInt(timestamp.substring(6, 8)),
          parseInt(timestamp.substring(9, 11)),
          parseInt(timestamp.substring(11, 13))
        );
        
        // Leer información adicional del reporte si existe
        let description = 'Backup automático diario';
        if (reportMap.has(timestamp)) {
          try {
            const reportPath = path.join(backupDir, reportMap.get(timestamp)!);
            const reportContent = await fs.readFile(reportPath, 'utf-8');
            
            // Extraer información del reporte
            const durationMatch = reportContent.match(/Duración: (\d+) segundos/);
            if (durationMatch) {
              description += ` (${durationMatch[1]}s)`;
            }
          } catch (error) {
            console.warn('Could not read backup report:', error);
          }
        }
        
        const newBackup = {
          id: backupId,
          name: `Backup Automático ${timestamp.replace('_', ' ')}`,
          description,
          date: backupDate.toISOString(),
          size: formatAutoBackupBytes(totalSize),
          sizeBytes: totalSize,
          integrity: 'verified',
          type: 'full',
          includesDocuments: true,
          documentTypes: ['documents', 'cvDocuments', 'profileImages'],
          path: dbPath // Ruta principal (base de datos)
        };
        
        metadata.push(newBackup);
        registered++;
        
        console.log(`🔄 Registered auto backup: ${backupId}`);
        
      } catch (error) {
        console.error(`Error registering auto backup ${timestamp}:`, error);
      }
    }
    
    if (registered > 0) {
      // Guardar metadata actualizado
      await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));
      console.log(`✅ Registered ${registered} auto backups in metadata`);
    }
    
  } catch (error) {
    console.error('Error detecting auto backups:', error);
  }
}

// Helper function para formatear bytes (local al módulo)
function formatAutoBackupBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
