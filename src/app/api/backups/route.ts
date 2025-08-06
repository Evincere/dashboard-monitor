import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Validation schemas
const CreateBackupSchema = z.object({
  name: z.string().min(1, 'Backup name is required'),
  description: z.string().optional(),
  includeDocuments: z.boolean().default(true),
});

const RestoreBackupSchema = z.object({
  backupId: z.string().min(1, 'Backup ID is required'),
  confirmRestore: z.boolean().refine(val => val === true, 'Restore confirmation is required'),
});

// Types
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
  path: string;
}

// Constants
const BACKUP_VOLUME_PATH = '/var/lib/docker/volumes/mpd_concursos_backup_data_prod/_data';
const BACKUP_METADATA_FILE = path.join(BACKUP_VOLUME_PATH, 'backup_metadata.json');

// Helper functions
async function getBackupMetadata(): Promise<BackupInfo[]> {
  try {
    const metadataContent = await fs.readFile(BACKUP_METADATA_FILE, 'utf-8');
    return JSON.parse(metadataContent);
  } catch (error) {
    // If metadata file doesn't exist, scan directory for existing backups
    return await scanExistingBackups();
  }
}

async function saveBackupMetadata(backups: BackupInfo[]): Promise<void> {
  await fs.writeFile(BACKUP_METADATA_FILE, JSON.stringify(backups, null, 2));
}

async function scanExistingBackups(): Promise<BackupInfo[]> {
  try {
    const files = await fs.readdir(BACKUP_VOLUME_PATH);
    const backups: BackupInfo[] = [];

    for (const file of files) {
      if (file.endsWith('.sql') || file.endsWith('.tar.gz')) {
        const filePath = path.join(BACKUP_VOLUME_PATH, file);
        const stats = await fs.stat(filePath);
        
        backups.push({
          id: file.replace(/\.(sql|tar\.gz)$/, ''),
          name: file,
          date: stats.mtime.toISOString(),
          size: formatBytes(stats.size),
          sizeBytes: stats.size,
          integrity: 'pending',
          type: 'full',
          includesDocuments: file.endsWith('.tar.gz'),
          path: filePath,
        });
      }
    }

    return backups;
  } catch (error) {
    console.error('Error scanning existing backups:', error);
    return [];
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function createDatabaseBackup(backupName: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `${backupName}_${timestamp}.sql`;
  const backupPath = path.join(BACKUP_VOLUME_PATH, backupFileName);

  // Create database backup using mysqldump
  const command = `docker exec mpd-concursos-mysql mysqldump -u root -proot1234 mpd_concursos > ${backupPath}`;
  
  try {
    await execAsync(command);
    return backupPath;
  } catch (error) {
    throw new Error(`Failed to create database backup: ${error}`);
  }
}

async function createDocumentsBackup(backupName: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `${backupName}_documents_${timestamp}.tar.gz`;
  const backupPath = path.join(BACKUP_VOLUME_PATH, backupFileName);

  // Create documents backup using tar
  const command = `tar -czf ${backupPath} -C /var/lib/docker/volumes/mpd_concursos_document_storage_prod/_data .`;
  
  try {
    await execAsync(command);
    return backupPath;
  } catch (error) {
    throw new Error(`Failed to create documents backup: ${error}`);
  }
}

async function verifyBackupIntegrity(backupPath: string): Promise<'verified' | 'failed'> {
  try {
    if (backupPath.endsWith('.sql')) {
      // Verify SQL backup by checking if it's valid SQL
      const content = await fs.readFile(backupPath, 'utf-8');
      if (content.includes('-- MySQL dump') && content.includes('-- Dump completed')) {
        return 'verified';
      }
    } else if (backupPath.endsWith('.tar.gz')) {
      // Verify tar.gz backup by testing the archive
      await execAsync(`tar -tzf ${backupPath} > /dev/null`);
      return 'verified';
    }
    return 'failed';
  } catch (error) {
    return 'failed';
  }
}

// API Handlers
export async function GET(request: NextRequest) {
  try {
    const backups = await getBackupMetadata();
    
    // Sort by date (newest first)
    backups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      data: backups,
      total: backups.length,
    });
  } catch (error) {
    console.error('Error fetching backups:', error);
    // If we can't read metadata but can scan directory, return empty array
    try {
      const emptyBackups = await scanExistingBackups();
      return NextResponse.json({
        success: true,
        data: emptyBackups,
        total: emptyBackups.length,
      });
    } catch (scanError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch backups' },
        { status: 500 }
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateBackupSchema.parse(body);

    const { name, description, includeDocuments } = validatedData;
    const timestamp = new Date().toISOString();
    const backupId = `backup_${Date.now()}`;

    // Create database backup
    const dbBackupPath = await createDatabaseBackup(name);
    let dbStats;
    try {
      dbStats = await fs.stat(dbBackupPath);
    } catch (error) {
      throw new Error('Failed to create database backup file');
    }

    let documentsBackupPath: string | null = null;
    let totalSize = dbStats.size;

    // Create documents backup if requested
    if (includeDocuments) {
      try {
        documentsBackupPath = await createDocumentsBackup(name);
        const docStats = await fs.stat(documentsBackupPath);
        totalSize += docStats.size;
      } catch (error) {
        console.warn('Failed to create documents backup:', error);
        // Continue without documents backup
      }
    }

    // Verify backup integrity
    const dbIntegrity = await verifyBackupIntegrity(dbBackupPath);
    const docIntegrity = documentsBackupPath ? await verifyBackupIntegrity(documentsBackupPath) : 'verified';
    
    const overallIntegrity = dbIntegrity === 'verified' && docIntegrity === 'verified' ? 'verified' : 'failed';

    // Create backup info
    const backupInfo: BackupInfo = {
      id: backupId,
      name,
      description,
      date: timestamp,
      size: formatBytes(totalSize),
      sizeBytes: totalSize,
      integrity: overallIntegrity,
      type: 'full',
      includesDocuments: includeDocuments,
      path: dbBackupPath,
    };

    // Update metadata
    const existingBackups = await getBackupMetadata();
    existingBackups.push(backupInfo);
    await saveBackupMetadata(existingBackups);

    return NextResponse.json({
      success: true,
      data: backupInfo,
      message: 'Backup created successfully',
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = RestoreBackupSchema.parse(body);

    const { backupId, confirmRestore } = validatedData;

    // Find backup
    const backups = await getBackupMetadata();
    const backup = backups.find(b => b.id === backupId);

    if (!backup) {
      return NextResponse.json(
        { success: false, error: 'Backup not found' },
        { status: 404 }
      );
    }

    if (backup.integrity !== 'verified') {
      return NextResponse.json(
        { success: false, error: 'Cannot restore backup with failed integrity check' },
        { status: 400 }
      );
    }

    // Restore database
    if (backup.path.endsWith('.sql')) {
      const restoreCommand = `docker exec -i mpd-concursos-mysql mysql -u root -proot1234 mpd_concursos < ${backup.path}`;
      await execAsync(restoreCommand);
    }

    // TODO: Implement document restoration if needed
    // This would require careful handling to avoid data loss

    return NextResponse.json({
      success: true,
      message: 'Backup restored successfully',
      restoredBackup: backup,
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to restore backup' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('id');

    if (!backupId) {
      return NextResponse.json(
        { success: false, error: 'Backup ID is required' },
        { status: 400 }
      );
    }

    // Find and remove backup
    const backups = await getBackupMetadata();
    const backupIndex = backups.findIndex(b => b.id === backupId);

    if (backupIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Backup not found' },
        { status: 404 }
      );
    }

    const backup = backups[backupIndex];

    // Delete backup files
    try {
      await fs.unlink(backup.path);
      
      // Also delete documents backup if it exists
      if (backup.includesDocuments) {
        const documentsBackupPath = backup.path.replace('.sql', '_documents.tar.gz');
        try {
          await fs.unlink(documentsBackupPath);
        } catch (error) {
          console.warn('Documents backup file not found or already deleted');
        }
      }
    } catch (error) {
      console.error('Error deleting backup files:', error);
    }

    // Remove from metadata
    backups.splice(backupIndex, 1);
    await saveBackupMetadata(backups);

    return NextResponse.json({
      success: true,
      message: 'Backup deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete backup' },
      { status: 500 }
    );
  }
}