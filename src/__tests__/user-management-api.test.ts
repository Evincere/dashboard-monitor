// src/__tests__/user-management-api.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/users/route';
import { GET as getUserById, PUT, DELETE, PATCH } from '@/app/api/users/[id]/route';

// Mock the database connection
vi.mock('@/services/database', () => ({
  getDatabaseConnection: vi.fn(() => ({
    execute: vi.fn(),
    release: vi.fn()
  }))
}));

describe('User Management API', () => {
  let mockConnection: any;

  beforeEach(() => {
    mockConnection = {
      execute: vi.fn(),
      release: vi.fn()
    };
    
    const { getDatabaseConnection } = require('@/services/database');
    getDatabaseConnection.mockResolvedValue(mockConnection);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('should fetch users with pagination', async () => {
      // Mock database responses
      mockConnection.execute
        .mockResolvedValueOnce([
          [{ total: 25 }], // count query
          {}
        ])
        .mockResolvedValueOnce([
          [
            {
              id: 'user-1',
              name: 'John Doe',
              username: 'johndoe',
              email: 'john@example.com',
              role: 'ROLE_USER',
              status: 'ACTIVE',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              last_login: null
            }
          ], // users query
          {}
        ]);

      const request = new NextRequest('http://localhost:3000/api/users?page=1&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(1);
      expect(data.pagination.total).toBe(25);
      expect(data.users[0].name).toBe('John Doe');
    });

    it('should handle search filtering', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ total: 1 }], {}])
        .mockResolvedValueOnce([
          [
            {
              id: 'user-1',
              name: 'John Doe',
              username: 'johndoe',
              email: 'john@example.com',
              role: 'ROLE_USER',
              status: 'ACTIVE',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              last_login: null
            }
          ],
          {}
        ]);

      const request = new NextRequest('http://localhost:3000/api/users?search=john');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('(name LIKE ? OR email LIKE ? OR username LIKE ?)'),
        expect.arrayContaining(['%john%', '%john%', '%john%', 10, 0])
      );
    });

    it('should handle role and status filtering', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ total: 1 }], {}])
        .mockResolvedValueOnce([[]], {});

      const request = new NextRequest('http://localhost:3000/api/users?role=ROLE_ADMIN&status=ACTIVE');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('role = ?'),
        expect.arrayContaining(['ROLE_ADMIN', 'ACTIVE', 10, 0])
      );
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user successfully', async () => {
      // Mock check for existing user (none found)
      mockConnection.execute
        .mockResolvedValueOnce([[], {}])
        // Mock insert user
        .mockResolvedValueOnce([{ insertId: 123 }, {}]);

      const userData = {
        name: 'Jane Doe',
        username: 'janedoe',
        email: 'jane@example.com',
        password: 'password123',
        role: 'ROLE_USER',
        status: 'ACTIVE'
      };

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('User created successfully');
      expect(data.userId).toBe(123);
    });

    it('should reject duplicate username or email', async () => {
      // Mock existing user found
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: 'existing-user' }],
        {}
      ]);

      const userData = {
        name: 'Jane Doe',
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123',
        role: 'ROLE_USER',
        status: 'ACTIVE'
      };

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Username or email already exists');
    });

    it('should validate required fields', async () => {
      const invalidUserData = {
        name: '',
        username: 'ab', // too short
        email: 'invalid-email',
        password: '123', // too short
        role: 'INVALID_ROLE'
      };

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify(invalidUserData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
    });
  });

  describe('GET /api/users/[id]', () => {
    it('should fetch a single user by ID', async () => {
      mockConnection.execute.mockResolvedValueOnce([
        [
          {
            id: 'user-1',
            name: 'John Doe',
            username: 'johndoe',
            email: 'john@example.com',
            role: 'ROLE_USER',
            status: 'ACTIVE',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            last_login: null,
            document_count: 5
          }
        ],
        {}
      ]);

      const request = new NextRequest('http://localhost:3000/api/users/user-1');
      const response = await getUserById(request, { params: { id: 'user-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.name).toBe('John Doe');
      expect(data.user.documentCount).toBe(5);
    });

    it('should return 404 for non-existent user', async () => {
      mockConnection.execute.mockResolvedValueOnce([[], {}]);

      const request = new NextRequest('http://localhost:3000/api/users/non-existent');
      const response = await getUserById(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });
  });

  describe('PUT /api/users/[id]', () => {
    it('should update user successfully', async () => {
      // Mock user exists check
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 'user-1', name: 'John Doe' }], {}])
        // Mock no conflicts
        .mockResolvedValueOnce([[], {}])
        // Mock update
        .mockResolvedValueOnce([{ affectedRows: 1 }, {}]);

      const updateData = {
        name: 'John Smith',
        email: 'johnsmith@example.com'
      };

      const request = new NextRequest('http://localhost:3000/api/users/user-1', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      const response = await PUT(request, { params: { id: 'user-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('User updated successfully');
    });

    it('should prevent duplicate username/email conflicts', async () => {
      // Mock user exists
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 'user-1' }], {}])
        // Mock conflict found
        .mockResolvedValueOnce([[{ id: 'other-user' }], {}]);

      const updateData = {
        username: 'conflictuser',
        email: 'conflict@example.com'
      };

      const request = new NextRequest('http://localhost:3000/api/users/user-1', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      const response = await PUT(request, { params: { id: 'user-1' } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Username or email already exists');
    });
  });

  describe('DELETE /api/users/[id]', () => {
    it('should delete user successfully', async () => {
      // Mock user exists with document count
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 'user-1', name: 'John Doe', document_count: 0 }], {}])
        // Mock delete
        .mockResolvedValueOnce([{ affectedRows: 1 }, {}]);

      const request = new NextRequest('http://localhost:3000/api/users/user-1');
      const response = await DELETE(request, { params: { id: 'user-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('User deleted successfully');
      expect(data.deletedUser).toBe('John Doe');
    });

    it('should warn about documents when deleting user with documents', async () => {
      // Mock user exists with documents
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 'user-1', name: 'John Doe', document_count: 5 }], {}])
        // Mock delete
        .mockResolvedValueOnce([{ affectedRows: 1 }, {}]);

      const request = new NextRequest('http://localhost:3000/api/users/user-1');
      const response = await DELETE(request, { params: { id: 'user-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.documentsAffected).toBe(5);
    });
  });

  describe('PATCH /api/users/[id]', () => {
    it('should activate user successfully', async () => {
      // Mock user exists
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 'user-1', name: 'John Doe', status: 'INACTIVE' }], {}])
        // Mock update
        .mockResolvedValueOnce([{ affectedRows: 1 }, {}]);

      const request = new NextRequest('http://localhost:3000/api/users/user-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'activate' })
      });

      const response = await PATCH(request, { params: { id: 'user-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('User activated successfully');
      expect(data.newStatus).toBe('ACTIVE');
      expect(data.previousStatus).toBe('INACTIVE');
    });

    it('should handle invalid actions', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/user-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'invalid' })
      });

      const response = await PATCH(request, { params: { id: 'user-1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid action');
    });

    it('should not update if status is already the same', async () => {
      // Mock user exists with same status
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: 'user-1', name: 'John Doe', status: 'ACTIVE' }],
        {}
      ]);

      const request = new NextRequest('http://localhost:3000/api/users/user-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'activate' })
      });

      const response = await PATCH(request, { params: { id: 'user-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('already active');
    });
  });
});