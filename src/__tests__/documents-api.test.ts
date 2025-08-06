// src/__tests__/documents-api.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/documents/route';
import { NextRequest } from 'next/server';

// Mock the database connection
vi.mock('@/services/database', () => ({
  getDatabaseConnection: vi.fn(() => ({
    execute: vi.fn(),
    release: vi.fn(),
  })),
}));

describe('/api/documents', () => {
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

  describe('GET /api/documents', () => {
    it('should return documents with pagination and statistics', async () => {
      // Mock database responses
      const mockCountResult = [{ total: 100 }];
      const mockDocumentsResult = [
        {
          id: 'ABC123',
          name: 'document1.pdf',
          original_name: 'Original Document 1.pdf',
          file_path: '/path/to/document1.pdf',
          file_size: 1024000,
          mime_type: 'application/pdf',
          document_type: 'CV',
          validation_status: 'PENDING',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          user_id: 'USER123',
          user_name: 'Juan Pérez',
          user_email: 'juan@example.com',
          contest_id: 'CONTEST123',
          contest_title: 'Concurso de Abogados'
        }
      ];
      const mockStatsResult = [
        {
          total_documents: 100,
          unique_users: 50,
          total_size: 1024000000,
          avg_size: 10240000,
          pending_count: 30,
          approved_count: 60,
          rejected_count: 10
        }
      ];
      const mockTypesResult = [
        { document_type: 'CV', count: 40 },
        { document_type: 'TITULO_GRADO', count: 35 },
        { document_type: 'DNI', count: 25 }
      ];

      mockConnection.execute
        .mockResolvedValueOnce([mockCountResult, {}])
        .mockResolvedValueOnce([mockDocumentsResult, {}])
        .mockResolvedValueOnce([mockStatsResult, {}])
        .mockResolvedValueOnce([mockTypesResult, {}]);

      const request = new NextRequest('http://localhost:3000/api/documents?page=1&limit=20');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.documents).toHaveLength(1);
      expect(data.documents[0]).toMatchObject({
        id: 'ABC123',
        name: 'document1.pdf',
        originalName: 'Original Document 1.pdf',
        documentType: 'CV',
        validationStatus: 'PENDING',
        user: {
          id: 'USER123',
          name: 'Juan Pérez',
          email: 'juan@example.com'
        }
      });
      expect(data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5
      });
      expect(data.statistics).toMatchObject({
        totalDocuments: 100,
        uniqueUsers: 50,
        statusCounts: {
          pending: 30,
          approved: 60,
          rejected: 10
        }
      });
    });

    it('should apply search filters correctly', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ total: 5 }], {}])
        .mockResolvedValueOnce([[], {}])
        .mockResolvedValueOnce([[{ total_documents: 5 }], {}])
        .mockResolvedValueOnce([[], {}]);

      const request = new NextRequest('http://localhost:3000/api/documents?search=juan&type=CV&status=PENDING');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining(['%juan%', '%juan%', '%juan%', '%juan%', 'CV', 'PENDING'])
      );
    });

    it('should handle database errors gracefully', async () => {
      mockConnection.execute.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/documents');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch documents');
    });
  });

  describe('PUT /api/documents', () => {
    it('should update document validation status', async () => {
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }, {}]);

      const request = new NextRequest('http://localhost:3000/api/documents?id=ABC123', {
        method: 'PUT',
        body: JSON.stringify({ validation_status: 'APPROVED' })
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE documents'),
        ['APPROVED', 'ABC123']
      );
    });

    it('should return 400 if document ID is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'PUT',
        body: JSON.stringify({ validation_status: 'APPROVED' })
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Document ID is required');
    });

    it('should validate status values', async () => {
      const request = new NextRequest('http://localhost:3000/api/documents?id=ABC123', {
        method: 'PUT',
        body: JSON.stringify({ validation_status: 'INVALID_STATUS' })
      });

      const response = await PUT(request);
      expect(response.status).toBe(500); // Zod validation error
    });
  });

  describe('DELETE /api/documents', () => {
    it('should delete document successfully', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ file_path: '/path/to/file.pdf', name: 'document.pdf' }], {}])
        .mockResolvedValueOnce([{ affectedRows: 1 }, {}]);

      const request = new NextRequest('http://localhost:3000/api/documents?id=ABC123', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT file_path'),
        ['ABC123']
      );
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM documents'),
        ['ABC123']
      );
    });

    it('should return 404 if document not found', async () => {
      mockConnection.execute.mockResolvedValueOnce([[], {}]);

      const request = new NextRequest('http://localhost:3000/api/documents?id=NONEXISTENT', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Document not found');
    });

    it('should return 400 if document ID is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Document ID is required');
    });
  });
});