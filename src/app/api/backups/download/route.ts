import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { createReadStream, statSync } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BACKUP_VOLUME_PATH = process.env.NODE_ENV === 'production' 
  ? '/opt/mpd-monitor/backups' 
  : path.resolve('./database/backups');
const BACKUP_METADATA_FILE = path.join(BACKUP_VOLUME_PATH, 'backup_metadata.json');
const DOCUMENTS_BASE_PATH = process.env.NODE_ENV === 'production'
  ? '/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data'
  : path.resolve('./storage');

// Document type mappings
const DOCUMENT_TYPE_MAPPINGS = {
  documents: {
    path: 'documents',
    label: 'Documentos de Postulación'
  },
  cvDocuments: {
    path: 'cv-documents', 
    label: 'Currículums Vitae'
  },
  profileImages: {
    path: 'profile-images',
    label: 'Imágenes de Perfil'
  }
};

interface BackupInfo {
  id: string;
  name: string;
  description?: string;
  date: string;
  size: string;
  sizeBytes: number;
  integrity: 'verified' | 'pending' | 'failed';
  type: 'full' | 'incremental';
  includesDocuments: boolean;
  documentTypes?: string[];
  path: string;
}

interface DownloadResult {
  filePath: string;
  fileName: string;
  contentType: string;
  size: number;
}

// Función para obtener metadatos de backup
async function getBackupMetadata(): Promise<BackupInfo[]> {
  try {
    const metadataContent = await fs.readFile(BACKUP_METADATA_FILE, 'utf-8');
    return JSON.parse(metadataContent);
  } catch (error) {
    console.error('Error reading backup metadata:', error);
    return [];
  }
}

// Función para determinar si es un backup automático
function isAutoBackup(backupId: string): boolean {
  return backupId.includes('auto_backup_') || backupId.includes('Backup_Automatico');
}

// Función para manejar descarga de backup automático
async function handleAutoBackupDownload(backup: BackupInfo, downloadType: string): Promise<DownloadResult> {
  if (downloadType === 'database') {
    // Para backup de base de datos automático, buscar el archivo .sql.gz
    const dbBackupPath = backup.path.replace(/\.zip$/, '_db.sql.gz');
    const exists = await fs.access(dbBackupPath).then(() => true).catch(() => false);
    
    if (exists) {
      const stats = await fs.stat(dbBackupPath);
      return {
        filePath: dbBackupPath,
        fileName: `db_backup_${backup.id}.sql.gz`,
        contentType: 'application/gzip',
        size: stats.size
      };
    }
  }
  
  if (downloadType === 'documents') {
    console.log(`Documents backup not found for backup: ${backup.name}`);
    throw new Error('Documents backup not available');
  }
  
  // Si no se especifica tipo o es 'auto', devolver el backup completo
  const stats = await fs.stat(backup.path);
  return {
    filePath: backup.path,
    fileName: path.basename(backup.path),
    contentType: backup.path.endsWith('.zip') ? 'application/zip' : 'application/gzip',
    size: stats.size
  };
}

// Función para manejar descarga de backup manual
async function handleManualBackupDownload(backup: BackupInfo, downloadType: string): Promise<DownloadResult> {
  if (downloadType === 'database') {
    // Para backup manual de base de datos
    const stats = await fs.stat(backup.path);
    return {
      filePath: backup.path,
      fileName: path.basename(backup.path),
      contentType: backup.path.endsWith('.gz') ? 'application/gzip' : 'application/sql',
      size: stats.size
    };
  }

  if (downloadType === 'documents') {
    const documentsPath = backup.path.replace(/\.(sql|sql\.gz)$/, '_documents.tar.gz');
    const hasDocuments = await fs.access(documentsPath).then(() => true).catch(() => false);
    
    if (!hasDocuments) {
      throw new Error('Documents backup not available');
    }
    
    const stats = await fs.stat(documentsPath);
    return {
      filePath: documentsPath,
      fileName: path.basename(documentsPath),
      contentType: 'application/gzip',
      size: stats.size
    };
  }

  if (downloadType === 'combined') {
    return await createCombinedManualBackup(backup);
  } else {
    // Default: return database backup
    return await createCombinedManualBackup(backup);
  }
}

// Función para crear backup combinado de backup manual
async function createCombinedManualBackup(backup: BackupInfo): Promise<DownloadResult> {
  const documentsPath = backup.path.replace(/\.(sql|sql\.gz)$/, '_documents.tar.gz');
  const hasDocuments = await fs.access(documentsPath).then(() => true).catch(() => false);
  
  if (!hasDocuments) {
    // Si no hay documentos, devolver solo la base de datos
    const dbStats = await fs.stat(backup.path);
    return {
      filePath: backup.path,
      fileName: path.basename(backup.path),
      contentType: backup.path.endsWith('.gz') ? 'application/gzip' : 'application/sql',
      size: dbStats.size
    };
  }
  
  // Crear ZIP combinado
  const combinedFileName = `${backup.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_combined.zip`;
  const combinedPath = path.join(BACKUP_VOLUME_PATH, combinedFileName);
  
  try {
    const zipCommand = `cd "${BACKUP_VOLUME_PATH}" && zip -j "${combinedFileName}" "${path.basename(backup.path)}" "${path.basename(documentsPath)}"`;
    await execAsync(zipCommand);
    
    const stats = await fs.stat(combinedPath);
    
    return {
      filePath: combinedPath,
      fileName: combinedFileName,
      contentType: 'application/zip',
      size: stats.size
    };
    
  } catch (error) {
    console.error('Error creating combined manual backup:', error);
    throw new Error(`Failed to create combined backup: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('backup');
    const downloadType = searchParams.get('type') || 'auto';

    if (!backupId) {
      return NextResponse.json({
        success: false,
        error: 'Backup ID is required'
      }, { status: 400 });
    }

    // Obtener información del backup
    const backups = await getBackupMetadata();
    const backup = backups.find(b => b.id === backupId);

    if (!backup) {
      return NextResponse.json({
        success: false,
        error: 'Backup not found'
      }, { status: 404 });
    }

    console.log(`Processing download for backup: ${backup.name}, type: ${downloadType}, isAuto: ${isAutoBackup(backupId)}`);

    let downloadResult: DownloadResult;

    // Determinar el tipo de backup y procesarlo apropiadamente
    if (isAutoBackup(backupId)) {
      downloadResult = await handleAutoBackupDownload(backup, downloadType);
    } else {
      downloadResult = await handleManualBackupDownload(backup, downloadType);
    }

    // Verificar que el archivo existe antes de enviarlo
    await fs.access(downloadResult.filePath);

    // NUEVA IMPLEMENTACIÓN: Usar streaming en lugar de cargar todo en memoria
    const fileStats = statSync(downloadResult.filePath);
    
    // Crear stream de lectura del archivo
    const readableStream = new ReadableStream({
      start(controller) {
        const fileStream = createReadStream(downloadResult.filePath);
        
        fileStream.on('data', (chunk: Buffer | string) => {
          controller.enqueue(new Uint8Array(typeof chunk === 'string' ? Buffer.from(chunk) : chunk));
        });

        fileStream.on('end', () => {
          controller.close();
        });

        fileStream.on('error', (error) => {
          console.error('File stream error:', error);
          controller.error(error);
        });
      }
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Disposition': `attachment; filename="${downloadResult.fileName}"`,
        'Content-Type': downloadResult.contentType,
        'Content-Length': fileStats.size.toString(),
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked'
      },
    });

  } catch (error) {
    console.error('Error downloading backup:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download backup'
    }, { status: 500 });
  }
}
