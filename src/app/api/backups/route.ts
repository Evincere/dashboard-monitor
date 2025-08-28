import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import mysql from 'mysql2/promise';
import { detectAndRegisterAutoBackups } from "@/lib/auto-backup-detection";

const execAsync = promisify(exec);

// Validation schemas
const CreateBackupSchema = z.object({
  name: z.string().min(1, 'Backup name is required'),
  description: z.string().optional(),
  includeDocuments: z.boolean().default(true),
  documentTypes: z.object({
    documents: z.boolean().default(true),
    cvDocuments: z.boolean().default(true),
    profileImages: z.boolean().default(true),
  }).optional(),
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
  documentTypes?: string[];
  path: string;
}

// Document type mappings
const DOCUMENT_TYPE_MAPPINGS = {
  documents: {
    path: 'documents',
    label: 'Documentos de Postulación',
    description: 'Documentos principales de las postulaciones'
  },
  cvDocuments: {
    path: 'cv-documents',
    label: 'Currículums Vitae', 
    description: 'CVs y documentos profesionales'
  },
  profileImages: {
    path: 'profile-images',
    label: 'Imágenes de Perfil',
    description: 'Fotos de perfil y documentos visuales'
  }
};

// Constants
const BACKUP_VOLUME_PATH = process.env.NODE_ENV === 'production' 
  ? '/opt/mpd-monitor/backups' 
  : path.resolve('./database/backups');
const DOCUMENTS_BASE_PATH = process.env.NODE_ENV === 'production'
  ? '/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data'
  : path.resolve('./storage');
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

  // Ensure backup directory exists
  await fs.mkdir(BACKUP_VOLUME_PATH, { recursive: true });

  if (process.env.NODE_ENV === 'production') {
    // Production: use Docker mysqldump
    const command = `docker exec mpd-concursos-mysql mysqldump -u root -proot1234 mpd_concursos > "${backupPath}"`;
    
    try {
      await execAsync(command);
      
      // Verify backup file was created and has content
      const stats = await fs.stat(backupPath);
      if (stats.size === 0) {
        throw new Error('Backup file created but is empty');
      }
      
      return backupPath;
    } catch (error) {
      // Clean up failed backup file
      try {
        await fs.unlink(backupPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw new Error(`Failed to create database backup: ${error}`);
    }
  } else {
    // Development: create backup using Node.js mysql2 connection
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = parseInt(process.env.DB_PORT || '3306');
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || 'root1234';
    const dbName = process.env.DB_DATABASE || 'mpd_concursos';
    
    let connection: mysql.Connection | null = null;
    
    try {
      // Create connection
      connection = await mysql.createConnection({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        database: dbName,
      });

      // Start building the SQL dump
      let sqlDump = `-- MySQL dump for database: ${dbName}\n`;
      sqlDump += `-- Generated on: ${new Date().toISOString()}\n`;
      sqlDump += `-- Host: ${dbHost}:${dbPort}\n\n`;
      sqlDump += `SET FOREIGN_KEY_CHECKS=0;\n\n`;

      // Get all tables
      const [tables] = await connection.execute('SHOW TABLES');
      
      for (const tableRow of tables as any[]) {
        const tableName = Object.values(tableRow)[0] as string;
        
        // Get table structure
        const [createTable] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``);
        const createTableSql = (createTable as any[])[0]['Create Table'];
        
        sqlDump += `-- Structure for table \`${tableName}\`\n`;
        sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
        sqlDump += `${createTableSql};\n\n`;
        
        // Get table data
        const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
        
        if ((rows as any[]).length > 0) {
          sqlDump += `-- Data for table \`${tableName}\`\n`;
          
          // Get column names
          const [columns] = await connection.execute(`DESCRIBE \`${tableName}\``);
          const columnNames = (columns as any[]).map(col => `\`${col.Field}\``);
          
          sqlDump += `INSERT INTO \`${tableName}\` (${columnNames.join(', ')}) VALUES\n`;
          
          const values = (rows as any[]).map(row => {
            const rowValues = Object.values(row).map(val => {
              if (val === null) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "\\'")}'`;
              if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
              return String(val);
            });
            return `(${rowValues.join(', ')})`;
          });
          
          sqlDump += values.join(',\n');
          sqlDump += ';\n\n';
        }
      }
      
      sqlDump += `SET FOREIGN_KEY_CHECKS=1;\n`;
      sqlDump += `-- Dump completed\n`;
      
      // Write to file
      await fs.writeFile(backupPath, sqlDump, 'utf-8');
      
      // Verify backup file was created and has content
      const stats = await fs.stat(backupPath);
      if (stats.size === 0) {
        throw new Error('Backup file created but is empty');
      }
      
      return backupPath;
      
    } catch (error) {
      // Clean up failed backup file
      try {
        await fs.unlink(backupPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw new Error(`Failed to create database backup: ${error}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
}

async function createDocumentsBackup(backupName: string, selectedTypes: string[]): Promise<{ path: string; totalSize: number; includedTypes: string[] }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `${backupName}_documents_${timestamp}.tar.gz`;
  const backupPath = path.join(BACKUP_VOLUME_PATH, backupFileName);

  // Ensure backup directory exists
  await fs.mkdir(BACKUP_VOLUME_PATH, { recursive: true });

  const includedTypes: string[] = [];
  let totalSize = 0;
  const tempDir = path.join(BACKUP_VOLUME_PATH, `temp_${timestamp}`);
  
  try {
    // Create temporary directory structure
    await fs.mkdir(tempDir, { recursive: true });
    
    // Process each selected document type
    for (const docType of selectedTypes) {
      const mapping = DOCUMENT_TYPE_MAPPINGS[docType as keyof typeof DOCUMENT_TYPE_MAPPINGS];
      if (!mapping) continue;

      const sourcePath = path.join(DOCUMENTS_BASE_PATH, mapping.path);
      const targetPath = path.join(tempDir, mapping.path);

      // Check if source directory exists
      try {
        await fs.access(sourcePath);
        const stats = await fs.stat(sourcePath);
        
        if (stats.isDirectory()) {
          // Copy directory to temp location
          await execAsync(`cp -r "${sourcePath}" "${targetPath}"`);
          
          // Calculate size
          const { stdout } = await execAsync(`du -sb "${targetPath}"`);
          const dirSize = parseInt(stdout.split('\t')[0]);
          totalSize += dirSize;
          
          includedTypes.push(docType);
          console.log(`✅ Included ${mapping.label} (${formatBytes(dirSize)})`);
        }
      } catch (error) {
        console.warn(`⚠️  Skipped ${mapping.label}: Directory not found or empty`);
        continue;
      }
    }

    if (includedTypes.length === 0) {
      throw new Error('No valid document directories found for the selected types');
    }

    // Create tar.gz from temporary directory
    const command = `tar -czf "${backupPath}" -C "${tempDir}" .`;
    await execAsync(command);
    
    // Verify backup was created
    const backupStats = await fs.stat(backupPath);
    if (backupStats.size === 0) {
      throw new Error('Documents backup created but is empty');
    }

    console.log(`✅ Documents backup created: ${backupPath} (${formatBytes(backupStats.size)})`);
    console.log(`📦 Included types: ${includedTypes.join(', ')}`);

    return { 
      path: backupPath, 
      totalSize: backupStats.size, 
      includedTypes 
    };

  } catch (error) {
    // Clean up failed backup
    try {
      await fs.unlink(backupPath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    throw new Error(`Failed to create documents backup: ${error}`);
  } finally {
    // Clean up temporary directory
    try {
      await execAsync(`rm -rf "${tempDir}"`);
    } catch (cleanupError) {
      console.warn('Could not cleanup temporary directory:', cleanupError);
    }
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
      await execAsync(`tar -tzf "${backupPath}" > /dev/null`);
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
    // Auto-detectar y registrar backups automáticos
    await detectAndRegisterAutoBackups(BACKUP_VOLUME_PATH, BACKUP_METADATA_FILE);
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

    const { name, description, includeDocuments, documentTypes } = validatedData;
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

    let documentsInfo: { path: string; totalSize: number; includedTypes: string[] } | null = null;
    let totalSize = dbStats.size;

    // Create documents backup if requested
    if (includeDocuments && documentTypes) {
      const selectedTypes = Object.entries(documentTypes)
        .filter(([_, selected]) => selected)
        .map(([type, _]) => type);

      if (selectedTypes.length > 0) {
        try {
          documentsInfo = await createDocumentsBackup(name, selectedTypes);
          totalSize += documentsInfo.totalSize;
        } catch (error) {
          console.warn('Failed to create documents backup:', error);
          // Continue without documents backup but log the error
        }
      }
    }

    // Verify backup integrity
    const dbIntegrity = await verifyBackupIntegrity(dbBackupPath);
    const docIntegrity = documentsInfo ? await verifyBackupIntegrity(documentsInfo.path) : 'verified';
    
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
      includesDocuments: !!documentsInfo,
      documentTypes: documentsInfo?.includedTypes || [],
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
      { success: false, error: 'Failed to create backup', details: error instanceof Error ? error.message : String(error) },
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
      const restoreCommand = `docker exec -i mpd-concursos-mysql mysql -u root -proot1234 mpd_concursos < "${backup.path}"`;
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
        const documentsBackupPath = backup.path.replace('.sql', '_documents_*.tar.gz');
        try {
          const { stdout } = await execAsync(`ls ${documentsBackupPath} 2>/dev/null || echo ""`);
          if (stdout.trim()) {
            await execAsync(`rm -f ${documentsBackupPath}`);
          }
        } catch (error) {
          console.warn('Documents backup files not found or already deleted');
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
