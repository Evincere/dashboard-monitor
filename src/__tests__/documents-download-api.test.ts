// src/__tests__/documents-download-api.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '@/app/api/documents/download/route';
import { NextRequest } from 'next/server';

// Mock the backend client
vi.mock('@/lib/backend-client', () => ({
  default: {
    downloadDocument: vi.fn(),
  },
}));

describe('/api/documents/download', () => {
  let backendClient: any;

  beforeEach(() => {
    backendClient = require('@/lib/backend-client').default;
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

    it('should return 404 if backend reports document not found', async () => {
      backendClient.downloadDocument.mockResolvedValue({
        success: false,
        error: 'Document not found in backend'
      });

      const request = new NextRequest('http://localhost:3000/api/documents/download?id=NONEXISTENT');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Document not found in backend');
      expect(backendClient.downloadDocument).toHaveBeenCalledWith('NONEXISTENT');
    });

    it('should return 500 if backend returns success but no blob', async () => {
      backendClient.downloadDocument.mockResolvedValue({
        success: true,
        fileName: 'document.pdf',
        // Missing blob
      });

      const request = new NextRequest('http://localhost:3000/api/documents/download?id=ABC123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('No file content received from backend');
    });

    it('should return file when backend provides blob successfully', async () => {
      const mockFileContent = 'PDF file content mock';
      const mockBlob = new Blob([mockFileContent], { type: 'application/pdf' });
      
      // Mock arrayBuffer method
      const mockArrayBuffer = new ArrayBuffer(mockFileContent.length);
      const uint8Array = new Uint8Array(mockArrayBuffer);
      for (let i = 0; i < mockFileContent.length; i++) {
        uint8Array[i] = mockFileContent.charCodeAt(i);
      }

      backendClient.downloadDocument.mockResolvedValue({
        success: true,
        blob: {
          arrayBuffer: () => Promise.resolve(mockArrayBuffer),
          size: mockFileContent.length,
        },
        fileName: 'Original Document.pdf'
      });

      const request = new NextRequest('http://localhost:3000/api/documents/download?id=ABC123');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="Original Document.pdf"');
      expect(response.headers.get('Content-Length')).toBe(mockFileContent.length.toString());
      
      // Verificar que se llamó al backend con el ID correcto
      expect(backendClient.downloadDocument).toHaveBeenCalledWith('ABC123');
    });

    it('should determine correct MIME type based on file extension', async () => {
      const testCases = [
        { fileName: 'document.pdf', expectedMimeType: 'application/pdf' },
        { fileName: 'image.jpg', expectedMimeType: 'image/jpeg' },
        { fileName: 'image.jpeg', expectedMimeType: 'image/jpeg' },
        { fileName: 'image.png', expectedMimeType: 'image/png' },
        { fileName: 'image.gif', expectedMimeType: 'image/gif' },
        { fileName: 'document.doc', expectedMimeType: 'application/msword' },
        { fileName: 'document.docx', expectedMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { fileName: 'unknown.xyz', expectedMimeType: 'application/octet-stream' },
      ];

      for (const testCase of testCases) {
        const mockFileContent = 'mock content';
        const mockArrayBuffer = new ArrayBuffer(mockFileContent.length);

        backendClient.downloadDocument.mockResolvedValue({
          success: true,
          blob: {
            arrayBuffer: () => Promise.resolve(mockArrayBuffer),
            size: mockFileContent.length,
          },
          fileName: testCase.fileName
        });

        const request = new NextRequest(`http://localhost:3000/api/documents/download?id=${testCase.fileName}`);
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe(testCase.expectedMimeType);
        expect(response.headers.get('Content-Disposition')).toBe(`attachment; filename="${testCase.fileName}"`);
      }
    });

    it('should handle backend client errors gracefully', async () => {
      backendClient.downloadDocument.mockRejectedValue(new Error('Backend service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/documents/download?id=ABC123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process download request');
      expect(data.details).toBe('Backend service unavailable');
    });

    it('should handle authentication errors from backend', async () => {
      backendClient.downloadDocument.mockResolvedValue({
        success: false,
        error: 'Authentication failed with backend'
      });

      const request = new NextRequest('http://localhost:3000/api/documents/download?id=ABC123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Authentication failed with backend');
    });

    it('should provide correct cache control headers', async () => {
      const mockFileContent = 'PDF file content';
      const mockArrayBuffer = new ArrayBuffer(mockFileContent.length);

      backendClient.downloadDocument.mockResolvedValue({
        success: true,
        blob: {
          arrayBuffer: () => Promise.resolve(mockArrayBuffer),
          size: mockFileContent.length,
        },
        fileName: 'test.pdf'
      });

      const request = new NextRequest('http://localhost:3000/api/documents/download?id=TEST123');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
    });

    it('should use fallback filename when backend does not provide one', async () => {
      const mockFileContent = 'file content';
      const mockArrayBuffer = new ArrayBuffer(mockFileContent.length);

      backendClient.downloadDocument.mockResolvedValue({
        success: true,
        blob: {
          arrayBuffer: () => Promise.resolve(mockArrayBuffer),
          size: mockFileContent.length,
        },
        // No fileName provided by backend
      });

      const request = new NextRequest('http://localhost:3000/api/documents/download?id=XYZ789');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="documento_XYZ789"');
    });
  });
});
