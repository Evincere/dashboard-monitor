// src/__tests__/documents-download-api.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '@/app/api/documents/download/route';
import { NextRequest } from 'next/server';

// Mock the database connection
vi.mock('@/services/database', () => ({
  getDatabaseConnection: vi.fn(() => ({
    execute: vi.fn(),
    release: vi.fn(),
  })),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('/api/documents/download', () => {
  let mockConnection: any;

  beforeEach(() => {
    const { getDatabaseConnection } = require('@/services/database');
    mockConnection = {
      execute: vi.fn(),
      release: vi.fn(),
    };
    getDatabaseConnection.mockResolvedValue(mockConnection);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/documents/download', () => {
    it('should return 400 if document ID is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/documents/download');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Document ID is required');
    });

    it('should return 404 if document not found', async () => {
      mockConnection.execute.mockResolvedValueOnce([[], {}]);

      const request = new NextRequest('http://localhost:3000/api/documents/download?id=NONEXISTENT');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Document not found');
    });

    it('should return document metadata when file cannot be accessed', async () => {
      const mockDocumentData = {
        name: 'document.pdf',
        original_name: 'Original Document.pdf',
        file_path: 'documents/user123/document.pdf',
        file_size: 1024000,
        mime_type: 'application/pdf',
        user_name: 'Juan Pérez'
      };

      mockConnection.execute.mockResolvedValueOnce([[mockDocumentData], {}]);

      // Mock readFile to throw an error (file not accessible)
      const { readFile } = require('fs/promises');
      readFile.mockRejectedValue(new Error('File not found'));

      const request = new NextRequest('http://localhost:3000/api/documents/download?id=ABC123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('File not accessible');
      expect(data.document).toMatchObject({
        id: 'ABC123',
        name: 'document.pdf',
        originalName: 'Original Document.pdf',
        filePath: 'documents/user123/document.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        userName: 'Juan Pérez'
      });
      expect(data.instructions).toContain('document storage volume');
    });

    it('should return file when accessible', async () => {
      const mockDocumentData = {
        name: 'document.pdf',
        original_name: 'Original Document.pdf',
        file_path: 'documents/user123/document.pdf',
        file_size: 1024000,
        mime_type: 'application/pdf',
        user_name: 'Juan Pérez'
      };

      mockConnection.execute.mockResolvedValueOnce([[mockDocumentData], {}]);

      // Mock readFile to return file buffer
      const { readFile } = require('fs/promises');
      const mockFileBuffer = Buffer.from('PDF file content');
      readFile.mockResolvedValue(mockFileBuffer);

      const request = new NextRequest('http://localhost:3000/api/documents/download?id=ABC123');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="Original Document.pdf"');
      expect(response.headers.get('Content-Length')).toBe('1024000');
      expect(response.headers.get('X-Document-User')).toBe('Juan Pérez');

      // Check that the file buffer is returned
      const responseBuffer = await response.arrayBuffer();
      expect(Buffer.from(responseBuffer)).toEqual(mockFileBuffer);
    });

    it('should handle database errors gracefully', async () => {
      mockConnection.execute.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/documents/download?id=ABC123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to download document');
    });

    it('should use correct file path construction', async () => {
      const mockDocumentData = {
        name: 'document.pdf',
        original_name: 'Original Document.pdf',
        file_path: 'documents/user123/document.pdf',
        file_size: 1024000,
        mime_type: 'application/pdf',
        user_name: 'Juan Pérez'
      };

      mockConnection.execute.mockResolvedValueOnce([[mockDocumentData], {}]);

      const { readFile } = require('fs/promises');
      readFile.mockRejectedValue(new Error('File not found'));

      // Set environment variable for testing
      process.env.DOCUMENT_STORAGE_PATH = '/custom/storage/path';

      const request = new NextRequest('http://localhost:3000/api/documents/download?id=ABC123');
      const response = await GET(request);
      const data = await response.json();

      expect(data.document.fullPath).toBe('/custom/storage/path/documents/user123/document.pdf');

      // Clean up
      delete process.env.DOCUMENT_STORAGE_PATH;
    });
  });
});