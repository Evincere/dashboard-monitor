import { BackupDownloadJobData, Job } from '../types';
import { updateJob } from '../queue/manager';

// Import existing backup functionality
const BACKUP_VOLUME_PATH = process.env.NODE_ENV === 'production' 
  ? '/opt/mpd-monitor/backups' 
  : './database/backups';
const DOCUMENTS_BASE_PATH = process.env.NODE_ENV === 'production'
  ? '/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data'
  : './storage';

interface BackupProcessResult {
  filePath: string;
  fileName: string;
  contentType: string;
  size: number;
}

export async function processBackupDownloadJob(job: Job): Promise<BackupProcessResult> {
  const jobData = job.data as BackupDownloadJobData;
  const { backupId, backupName, downloadType } = jobData;

  await updateJob(job.id, {
    status: 'running',
    progress: 0,
    message: 'Starting backup preparation...'
  });

  try {
    // Step 1: Load backup metadata
    await updateJob(job.id, {
      progress: 10,
      message: 'Loading backup information...'
    });

    const backup = await getBackupInfo(backupId);
    if (!backup) {
      throw new Error('Backup not found');
    }

    // Step 2: Determine processing type
    await updateJob(job.id, {
      progress: 20,
      message: 'Determining backup components...'
    });

    let result: BackupProcessResult;

    switch (downloadType) {
      case 'database':
        result = await processDatabaseOnly(backup, job.id);
        break;
      case 'documents':
        result = await processDocumentsOnly(backup, job.id);
        break;
      case 'combined':
      case 'auto':
      default:
        result = await processCombinedBackup(backup, job.id);
        break;
    }

    // Step 3: Completion
    await updateJob(job.id, {
      status: 'completed',
      progress: 100,
      message: 'Backup prepared successfully',
      result: {
        filePath: result.filePath,
        fileName: result.fileName,
        contentType: result.contentType,
        size: result.size,
        downloadUrl: `/api/jobs/${job.id}/download`
      }
    });

    return result;

  } catch (error) {
    await updateJob(job.id, {
      status: 'failed',
      progress: 0,
      message: 'Failed to prepare backup',
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// Helper functions (simplified versions)
async function getBackupInfo(backupId: string): Promise<any> {
  // This would integrate with existing backup metadata loading
  // For now, simplified implementation
  try {
    const { promises: fs } = await import('fs');
    const path = await import('path');
    
    const metadataFile = path.join(BACKUP_VOLUME_PATH, 'backup_metadata.json');
    const content = await fs.readFile(metadataFile, 'utf-8');
    const backups = JSON.parse(content);
    
    return backups.find((b: any) => b.id === backupId);
  } catch (error) {
    return null;
  }
}

async function processDatabaseOnly(backup: any, jobId: string): Promise<BackupProcessResult> {
  await updateJob(jobId, {
    progress: 50,
    message: 'Preparing database backup...'
  });

  const { promises: fs } = await import('fs');
  const path = await import('path');
  
  await updateJob(jobId, {
    progress: 90,
    message: 'Verifying database backup...'
  });

  const stats = await fs.stat(backup.path);
  
  return {
    filePath: backup.path,
    fileName: path.basename(backup.path),
    contentType: 'application/sql',
    size: stats.size
  };
}

async function processDocumentsOnly(backup: any, jobId: string): Promise<BackupProcessResult> {
  await updateJob(jobId, {
    progress: 30,
    message: 'Locating documents backup...'
  });

  // Find existing documents backup or create new one
  const documentsPath = await findOrCreateDocumentsBackup(backup, jobId);
  
  await updateJob(jobId, {
    progress: 90,
    message: 'Verifying documents backup...'
  });

  const { promises: fs } = await import('fs');
  const path = await import('path');
  
  const stats = await fs.stat(documentsPath);
  
  return {
    filePath: documentsPath,
    fileName: path.basename(documentsPath),
    contentType: 'application/gzip',
    size: stats.size
  };
}

async function processCombinedBackup(backup: any, jobId: string): Promise<BackupProcessResult> {
  await updateJob(jobId, {
    progress: 30,
    message: 'Locating backup components...'
  });

  const documentsPath = backup.includesDocuments 
    ? await findOrCreateDocumentsBackup(backup, jobId)
    : null;

  await updateJob(jobId, {
    progress: 60,
    message: 'Creating combined archive...'
  });

  const combinedPath = await createCombinedArchive(backup, documentsPath, jobId);

  await updateJob(jobId, {
    progress: 90,
    message: 'Finalizing combined backup...'
  });

  const { promises: fs } = await import('fs');
  const path = await import('path');
  
  const stats = await fs.stat(combinedPath);
  
  return {
    filePath: combinedPath,
    fileName: path.basename(combinedPath),
    contentType: 'application/zip',
    size: stats.size
  };
}

async function findOrCreateDocumentsBackup(backup: any, jobId: string): Promise<string> {
  const path = await import('path');
  
  // Try to find existing documents backup
  const possiblePaths = [
    path.join(BACKUP_VOLUME_PATH, `${backup.name}_documents_*.tar.gz`),
    backup.path.replace('.sql', '_documents_*.tar.gz'),
  ];
  
  // For now, simplified - would integrate with existing document backup logic
  return path.join(BACKUP_VOLUME_PATH, `${backup.name}_documents_temp.tar.gz`);
}

async function createCombinedArchive(backup: any, documentsPath: string | null, jobId: string): Promise<string> {
  const path = await import('path');
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedName = backup.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const combinedPath = path.join(BACKUP_VOLUME_PATH, `${sanitizedName}_combined_${timestamp}.zip`);
  
  await updateJob(jobId, {
    progress: 70,
    message: 'Compressing files...'
  });

  // Create ZIP file
  let zipCommand = `cd "${BACKUP_VOLUME_PATH}" && zip -j "${combinedPath}"`;
  zipCommand += ` "${backup.path}"`;
  
  if (documentsPath) {
    zipCommand += ` "${documentsPath}"`;
  }

  await execAsync(zipCommand);
  
  return combinedPath;
}
