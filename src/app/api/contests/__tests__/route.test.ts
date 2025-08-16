/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../route';

// Mock database connection
jest.mock('@/services/database', () => ({
  getDatabaseConnection: jest.fn(),
}));

// Mock validation functions
jest.mock('@/lib/validations/contest-validation', () => ({
  validateContest: jest.fn(),
}));

const mockDatabaseConnection = {
  execute: jest.fn(),
  end: jest.fn(),
};

describe('/api/contests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getDatabaseConnection } = require('@/services/database');
    getDatabaseConnection.mockResolvedValue(mockDatabaseConnection);
  });

  describe('GET /api/contests', () => {
    it('should return contests list with pagination', async () => {
      const mockContests = [
        {
          id: 1,
          title: 'Test Contest 1',
          category: 'MAGISTRADOS',
          class_: '05',
          department: 'PRIMERA CIRCUNSCRIPCIÓN',
          position: 'Defensor/a Penal',
          functions: 'Test functions',
          status: 'DRAFT',
          start_date: '2024-12-01 00:00:00',
          end_date: '2024-12-31 23:59:59',
          inscription_start_date: '2024-11-01 00:00:00',
          inscription_end_date: '2024-11-30 23:59:59',
          bases_url: 'https://example.com/bases.pdf',
          description_url: 'https://example.com/description.pdf',
          created_at: '2024-01-01 00:00:00',
          updated_at: '2024-01-01 00:00:00',
        },
      ];

      const mockCountResult = [{ total: 1 }];

      mockDatabaseConnection.execute
        .mockResolvedValueOnce([mockContests]) // Main query
        .mockResolvedValueOnce([mockCountResult]); // Count query

      const request = new NextRequest('http://localhost:3000/api/contests?page=1&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        pages: 1,
      });
    });

    it('should handle search and filter parameters', async () => {
      mockDatabaseConnection.execute
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ total: 0 }]]);

      const request = new NextRequest(
        'http://localhost:3000/api/contests?search=test&status=ACTIVE&category=MAGISTRADOS'
      );
      const response = await GET(request);

      expect(mockDatabaseConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1 AND status = ? AND (title LIKE ? OR position LIKE ? OR functions LIKE ?) AND category = ?'),
        expect.arrayContaining(['ACTIVE', '%test%', '%test%', '%test%', 'MAGISTRADOS', 10, 0])
      );
    });

    it('should handle database errors gracefully', async () => {
      mockDatabaseConnection.execute.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/contests');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Error al obtener los concursos');
    });
  });

  describe('POST /api/contests', () => {
    it('should create a new contest successfully', async () => {
      const { validateContest } = require('@/lib/validations/contest-validation');
      validateContest.mockReturnValue({
        success: true,
        data: {
          title: 'New Contest',
          status: 'DRAFT',
          inscription_start_date: new Date('2024-11-01'),
          inscription_end_date: new Date('2024-11-30'),
        },
      });

      const mockInsertResult = { insertId: 1 };
      const mockNewContest = [
        {
          id: 1,
          title: 'New Contest',
          status: 'DRAFT',
          inscription_start_date: '2024-11-01 00:00:00',
          inscription_end_date: '2024-11-30 23:59:59',
          created_at: '2024-01-01 00:00:00',
          updated_at: '2024-01-01 00:00:00',
        },
      ];

      mockDatabaseConnection.execute
        .mockResolvedValueOnce([mockInsertResult])
        .mockResolvedValueOnce([mockNewContest]);

      const requestBody = {
        title: 'New Contest',
        status: 'DRAFT',
        inscription_start_date: '2024-11-01T00:00:00.000Z',
        inscription_end_date: '2024-11-30T23:59:59.000Z',
      };

      const request = new NextRequest('http://localhost:3000/api/contests', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(1);
      expect(data.message).toBe('Concurso creado exitosamente');
    });

    it('should reject invalid contest data', async () => {
      const { validateContest } = require('@/lib/validations/contest-validation');
      validateContest.mockReturnValue({
        success: false,
        errors: {
          title: ['El título debe tener al menos 5 caracteres'],
        },
      });

      const request = new NextRequest('http://localhost:3000/api/contests', {
        method: 'POST',
        body: JSON.stringify({ title: '' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Datos de validación incorrectos');
      expect(data.errors.title).toContain('El título debe tener al menos 5 caracteres');
    });

    it('should handle database errors during creation', async () => {
      const { validateContest } = require('@/lib/validations/contest-validation');
      validateContest.mockReturnValue({
        success: true,
        data: { title: 'Valid Contest' },
      });

      mockDatabaseConnection.execute.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/contests', {
        method: 'POST',
        body: JSON.stringify({ title: 'Valid Contest' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Error al crear el concurso');
    });
  });

  describe('PUT /api/contests', () => {
    it('should update an existing contest successfully', async () => {
      const { validateContest } = require('@/lib/validations/contest-validation');
      validateContest.mockReturnValue({
        success: true,
        data: {
          id: 1,
          title: 'Updated Contest',
          status: 'ACTIVE',
        },
      });

      const mockExistingContest = [{ id: 1 }];
      const mockUpdatedContest = [
        {
          id: 1,
          title: 'Updated Contest',
          status: 'ACTIVE',
          updated_at: '2024-01-02 00:00:00',
        },
      ];

      mockDatabaseConnection.execute
        .mockResolvedValueOnce([mockExistingContest]) // Check existence
        .mockResolvedValueOnce([]) // Update query
        .mockResolvedValueOnce([mockUpdatedContest]); // Fetch updated

      const request = new NextRequest('http://localhost:3000/api/contests', {
        method: 'PUT',
        body: JSON.stringify({
          id: 1,
          title: 'Updated Contest',
          status: 'ACTIVE',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Updated Contest');
      expect(data.message).toBe('Concurso actualizado exitosamente');
    });

    it('should return 404 for non-existent contest', async () => {
      const { validateContest } = require('@/lib/validations/contest-validation');
      validateContest.mockReturnValue({
        success: true,
        data: { id: 999, title: 'Non-existent Contest' },
      });

      mockDatabaseConnection.execute.mockResolvedValueOnce([[]]); // No contest found

      const request = new NextRequest('http://localhost:3000/api/contests', {
        method: 'PUT',
        body: JSON.stringify({ id: 999, title: 'Non-existent Contest' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Concurso no encontrado');
    });

    it('should require contest ID for updates', async () => {
      const request = new NextRequest('http://localhost:3000/api/contests', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Contest without ID' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('ID del concurso es requerido');
    });
  });

  describe('DELETE /api/contests', () => {
    it('should delete a contest successfully', async () => {
      const mockExistingContest = [{ id: 1, title: 'Contest to Delete' }];
      const mockInscriptionCount = [{ count: 0 }];
      const mockDeleteResult = { affectedRows: 1 };

      mockDatabaseConnection.execute
        .mockResolvedValueOnce([mockExistingContest]) // Check existence
        .mockResolvedValueOnce([mockInscriptionCount]) // Check inscriptions
        .mockResolvedValueOnce([mockDeleteResult]); // Delete contest

      const request = new NextRequest('http://localhost:3000/api/contests?id=1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Contest to Delete');
    });

    it('should prevent deletion of contest with inscriptions', async () => {
      const mockExistingContest = [{ id: 1, title: 'Contest with Inscriptions' }];
      const mockInscriptionCount = [{ count: 5 }];

      mockDatabaseConnection.execute
        .mockResolvedValueOnce([mockExistingContest])
        .mockResolvedValueOnce([mockInscriptionCount]);

      const request = new NextRequest('http://localhost:3000/api/contests?id=1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('inscripciones asociadas');
      expect(data.details).toContain('5 inscripciones');
    });

    it('should return 404 for non-existent contest', async () => {
      mockDatabaseConnection.execute.mockResolvedValueOnce([[]]); // No contest found

      const request = new NextRequest('http://localhost:3000/api/contests?id=999');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Concurso no encontrado');
    });

    it('should require contest ID for deletion', async () => {
      const request = new NextRequest('http://localhost:3000/api/contests');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('ID del concurso es requerido');
    });
  });

  describe('Error handling', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/contests', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Error al crear el concurso');
    });

    it('should handle database connection errors', async () => {
      const { getDatabaseConnection } = require('@/services/database');
      getDatabaseConnection.mockRejectedValue(new Error('Connection failed'));

      const request = new NextRequest('http://localhost:3000/api/contests');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Error al obtener los concursos');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
