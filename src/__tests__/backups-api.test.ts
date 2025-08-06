import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/backups/route';

// Mock fs promises
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
  },
}));

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

// Mock util
vi.mock('util', () => ({
  promisify: vi.fn((fn) => fn),
}));

const mockBackups = [
  {
    id: 'backup_1',
    name: 'Test Backup 1',
    description: 'Test backup description',
    date: '2024-01-01T00:00:00.000Z',
    size: '100 MB',
    sizeBytes: 104857600,
    integrity: 'verified' as const,
    type: 'full' as const,
    includesDocuments: true,
    path: '/backup/path/test1.sql',
  },
  {
    id: 'backup_2',
    name: 'Test Backup 2',
    date: '2024-01-02T00:00:00.000Z',
    size: '50 MB',
    sizeBytes: 52428800,
    integrity: 'pending' as const,
    type: 'full' as const,
    includesDocuments: false,
    path: '/backup/path/test2.sql',
  },
];

describe('/api/backups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/backups', () => {
    it('should return list of backups successfully', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockBackups));

      const request = new NextRequest('http://localhost:3000/api/backups');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.data[0].name).toBe('Test Backup 2'); // Should be sorted by date desc
    });

    it('should handle empty backup list', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.readFile).mockRejectedValue(new Error('File not found'));
      vi.mocked(fs.promises.readdir).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/backups');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.readFile).mockRejectedValue(new Error('Permission denied'));
      vi.mocked(fs.promises.readdir).mockRejectedValue(new Error('Permission denied'));

      const request = new NextRequest('http://localhost:3000/api/backups');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch backups');
    });
  });

  describe('POST /api/backups', () => {
    it('should create backup successfully', async () => {
      const fs = await import('fs');
      const { exec } = await import('child_process');
      
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify([]));
      vi.mocked(fs.promises.writeFile).mockResolvedValue();
      vi.mocked(fs.promises.stat).mockResolvedValue({ size: 1000000 } as any);
      vi.mocked(exec).mockImplementation((cmd, callback) => {
        callback?.(null, 'success', '');
        return {} as any;
      });

      // Mock backup verification
      vi.mocked(fs.promises.readFile).mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('.sql')) {
          return Promise.resolve('-- MySQL dump\n-- Dump completed');
        }
        return Promise.resolve(JSON.stringify([]));
      });

      const requestBody = {
        name: 'New Backup',
        description: 'Test backup',
        includeDocuments: false,
      };

      const request = new NextRequest('http://localhost:3000/api/backups', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New Backup');
      expect(data.data.integrity).toBe('verified');
    });

    it('should validate request data', async () => {
      const requestBody = {
        name: '', // Invalid empty name
        includeDocuments: false,
      };

      const request = new NextRequest('http://localhost:3000/api/backups', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request data');
    });

    it('should handle backup creation errors', async () => {
      const { exec } = await import('child_process');
      
      vi.mocked(exec).mockImplementation((cmd, callback) => {
        callback?.(new Error('Database connection failed'), '', 'error');
        return {} as any;
      });

      const requestBody = {
        name: 'Failed Backup',
        includeDocuments: false,
      };

      const request = new NextRequest('http://localhost:3000/api/backups', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to create backup');
    });
  });

  describe('PUT /api/backups (restore)', () => {
    it('should restore backup successfully', async () => {
      const fs = await import('fs');
      const { exec } = await import('child_process');
      
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockBackups));
      vi.mocked(exec).mockImplementation((cmd, callback) => {
        callback?.(null, 'success', '');
        return {} as any;
      });

      const requestBody = {
        backupId: 'backup_1',
        confirmRestore: true,
      };

      const request = new NextRequest('http://localhost:3000/api/backups', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Backup restored successfully');
    });

    it('should require restore confirmation', async () => {
      const requestBody = {
        backupId: 'backup_1',
        confirmRestore: false,
      };

      const request = new NextRequest('http://localhost:3000/api/backups', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request data');
    });

    it('should not restore backup with failed integrity', async () => {
      const fs = await import('fs');
      const failedBackup = { ...mockBackups[0], integrity: 'failed' as const };
      
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify([failedBackup]));

      const requestBody = {
        backupId: 'backup_1',
        confirmRestore: true,
      };

      const request = new NextRequest('http://localhost:3000/api/backups', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot restore backup with failed integrity check');
    });

    it('should handle backup not found', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockBackups));

      const requestBody = {
        backupId: 'nonexistent_backup',
        confirmRestore: true,
      };

      const request = new NextRequest('http://localhost:3000/api/backups', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Backup not found');
    });
  });

  describe('DELETE /api/backups', () => {
    it('should delete backup successfully', async () => {
      const fs = await import('fs');
      
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockBackups));
      vi.mocked(fs.promises.writeFile).mockResolvedValue();
      vi.mocked(fs.promises.unlink).mockResolvedValue();

      const request = new NextRequest('http://localhost:3000/api/backups?id=backup_1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Backup deleted successfully');
    });

    it('should require backup ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/backups');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Backup ID is required');
    });

    it('should handle backup not found', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockBackups));

      const request = new NextRequest('http://localhost:3000/api/backups?id=nonexistent_backup');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Backup not found');
    });

    it('should handle file deletion errors gracefully', async () => {
      const fs = await import('fs');
      
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(mockBackups));
      vi.mocked(fs.promises.writeFile).mockResolvedValue();
      vi.mocked(fs.promises.unlink).mockRejectedValue(new Error('File not found'));

      const request = new NextRequest('http://localhost:3000/api/backups?id=backup_1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Backup deleted successfully');
    });
  });
});