/**
 * @jest-environment node
 */

import { createMocks } from 'node-mocks-http';
import { GET, POST, PUT, DELETE } from '../../src/app/api/contests/route';

// Mock de la base de datos
const mockQuery = jest.fn();
jest.mock('mysql2/promise', () => ({
  createConnection: jest.fn(() => ({
    query: mockQuery,
    end: jest.fn(),
  })),
}));

// Mock del middleware de autenticación
jest.mock('../../src/middleware/auth', () => ({
  verifyAuth: jest.fn((handler) => handler),
}));

describe('/api/contests', () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe('GET /api/contests', () => {
    it('debe devolver lista de concursos exitosamente', async () => {
      const mockContests = [
        {
          id: 1,
          name: 'Concurso de Prueba',
          description: 'Descripción de prueba',
          start_date: '2024-06-01T00:00:00.000Z',
          end_date: '2024-06-30T23:59:59.000Z',
          status: 'active',
          type: 'contest',
          visibility: 'public',
          created_by: 1,
          created_at: '2024-05-01T10:00:00.000Z',
          updated_at: '2024-05-01T10:00:00.000Z'
        }
      ];

      mockQuery
        .mockResolvedValueOnce([{ total_count: 1 }])
        .mockResolvedValueOnce([mockContests]);

      const { req, res } = createMocks({
        method: 'GET',
        query: {}
      });

      await GET(req);

      const response = await new Promise((resolve) => {
        const originalJson = res.json;
        res.json = (data: any) => {
          resolve({ status: res.statusCode, data });
        };
        GET(req).then((response) => {
          resolve({ status: response.status, data: response });
        });
      }) as any;

      expect(response.status).toBe(200);
    });

    it('debe manejar filtros correctamente', async () => {
      mockQuery
        .mockResolvedValueOnce([{ total_count: 0 }])
        .mockResolvedValueOnce([[]]);

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          status: 'active',
          type: 'contest',
          search: 'prueba'
        }
      });

      const response = await GET(req);
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.any(Array)
      );
    });

    it('debe manejar paginación correctamente', async () => {
      mockQuery
        .mockResolvedValueOnce([{ total_count: 25 }])
        .mockResolvedValueOnce([[]]);

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          page: '2',
          limit: '10'
        }
      });

      await GET(req);
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([10, 10])
      );
    });

    it('debe manejar errores de base de datos', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const { req, res } = createMocks({
        method: 'GET'
      });

      const response = await GET(req);
      
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/contests', () => {
    const validContestData = {
      name: 'Nuevo Concurso',
      description: 'Descripción del nuevo concurso',
      start_date: '2024-06-01',
      end_date: '2024-06-30',
      status: 'draft',
      type: 'contest',
      visibility: 'public',
      created_by: 1
    };

    it('debe crear un concurso exitosamente', async () => {
      mockQuery.mockResolvedValue([{ insertId: 1 }]);

      const { req, res } = createMocks({
        method: 'POST',
        body: validContestData
      });

      const response = await POST(req);
      
      expect(response.status).toBe(201);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO contests'),
        expect.any(Array)
      );
    });

    it('debe validar datos requeridos', async () => {
      const invalidData = {
        name: '', // Nombre vacío
        description: 'Descripción válida'
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidData
      });

      const response = await POST(req);
      
      expect(response.status).toBe(400);
    });

    it('debe validar formato de fechas', async () => {
      const invalidData = {
        ...validContestData,
        start_date: 'fecha-inválida'
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidData
      });

      const response = await POST(req);
      
      expect(response.status).toBe(400);
    });

    it('debe validar que la fecha de fin sea posterior a la de inicio', async () => {
      const invalidData = {
        ...validContestData,
        start_date: '2024-06-30',
        end_date: '2024-06-01'
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidData
      });

      const response = await POST(req);
      
      expect(response.status).toBe(400);
    });

    it('debe manejar errores de base de datos', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const { req, res } = createMocks({
        method: 'POST',
        body: validContestData
      });

      const response = await POST(req);
      
      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/contests', () => {
    const updateData = {
      id: 1,
      name: 'Concurso Actualizado',
      description: 'Descripción actualizada',
      start_date: '2024-07-01',
      end_date: '2024-07-31',
      status: 'active',
      type: 'contest',
      visibility: 'public'
    };

    it('debe actualizar un concurso exitosamente', async () => {
      mockQuery.mockResolvedValue([{ affectedRows: 1 }]);

      const { req, res } = createMocks({
        method: 'PUT',
        body: updateData
      });

      const response = await PUT(req);
      
      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE contests'),
        expect.any(Array)
      );
    });

    it('debe validar que el ID esté presente', async () => {
      const invalidData = {
        ...updateData,
        id: undefined
      };

      const { req, res } = createMocks({
        method: 'PUT',
        body: invalidData
      });

      const response = await PUT(req);
      
      expect(response.status).toBe(400);
    });

    it('debe manejar concurso no encontrado', async () => {
      mockQuery.mockResolvedValue([{ affectedRows: 0 }]);

      const { req, res } = createMocks({
        method: 'PUT',
        body: updateData
      });

      const response = await PUT(req);
      
      expect(response.status).toBe(404);
    });

    it('debe validar datos de actualización', async () => {
      const invalidData = {
        id: 1,
        name: '', // Nombre vacío
        description: 'Descripción válida'
      };

      const { req, res } = createMocks({
        method: 'PUT',
        body: invalidData
      });

      const response = await PUT(req);
      
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/contests', () => {
    it('debe eliminar un concurso exitosamente', async () => {
      mockQuery.mockResolvedValue([{ affectedRows: 1 }]);

      const { req, res } = createMocks({
        method: 'DELETE',
        body: { id: 1 }
      });

      const response = await DELETE(req);
      
      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM contests'),
        [1]
      );
    });

    it('debe validar que el ID esté presente', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        body: {}
      });

      const response = await DELETE(req);
      
      expect(response.status).toBe(400);
    });

    it('debe manejar concurso no encontrado', async () => {
      mockQuery.mockResolvedValue([{ affectedRows: 0 }]);

      const { req, res } = createMocks({
        method: 'DELETE',
        body: { id: 999 }
      });

      const response = await DELETE(req);
      
      expect(response.status).toBe(404);
    });

    it('debe manejar errores de base de datos', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const { req, res } = createMocks({
        method: 'DELETE',
        body: { id: 1 }
      });

      const response = await DELETE(req);
      
      expect(response.status).toBe(500);
    });
  });

  describe('Validaciones de seguridad', () => {
    it('debe validar longitud máxima de campos', async () => {
      const longName = 'a'.repeat(256);
      const invalidData = {
        name: longName,
        description: 'Descripción válida',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        status: 'draft',
        type: 'contest',
        visibility: 'public',
        created_by: 1
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidData
      });

      const response = await POST(req);
      
      expect(response.status).toBe(400);
    });

    it('debe validar valores enum para status', async () => {
      const invalidData = {
        name: 'Concurso válido',
        description: 'Descripción válida',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        status: 'invalid-status',
        type: 'contest',
        visibility: 'public',
        created_by: 1
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidData
      });

      const response = await POST(req);
      
      expect(response.status).toBe(400);
    });

    it('debe validar valores enum para tipo', async () => {
      const invalidData = {
        name: 'Concurso válido',
        description: 'Descripción válida',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        status: 'draft',
        type: 'invalid-type',
        visibility: 'public',
        created_by: 1
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidData
      });

      const response = await POST(req);
      
      expect(response.status).toBe(400);
    });

    it('debe validar valores enum para visibilidad', async () => {
      const invalidData = {
        name: 'Concurso válido',
        description: 'Descripción válida',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        status: 'draft',
        type: 'contest',
        visibility: 'invalid-visibility',
        created_by: 1
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidData
      });

      const response = await POST(req);
      
      expect(response.status).toBe(400);
    });
  });
});
