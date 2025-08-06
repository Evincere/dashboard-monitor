// src/lib/user-validation.ts
import { z } from 'zod';

export const UserCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ROLE_ADMIN', 'ROLE_USER']).default('ROLE_USER'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).default('ACTIVE')
});

export const UserUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50).optional(),
  email: z.string().email('Invalid email format').max(255).optional(),
  role: z.enum(['ROLE_ADMIN', 'ROLE_USER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional()
});

export type UserRole = 'ROLE_ADMIN' | 'ROLE_USER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  registrationDate: string;
  updatedAt?: string;
  lastLogin?: string;
  documentCount?: number;
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UserListResponse {
  users: User[];
  pagination: Pagination;
  filters: UserFilters;
  cached: boolean;
  timestamp: string;
}

export const validateUserAction = (action: string): action is 'activate' | 'deactivate' | 'block' => {
  return ['activate', 'deactivate', 'block'].includes(action);
};

export const getNewStatusFromAction = (action: 'activate' | 'deactivate' | 'block'): UserStatus => {
  switch (action) {
    case 'activate':
      return 'ACTIVE';
    case 'deactivate':
      return 'INACTIVE';
    case 'block':
      return 'BLOCKED';
    default:
      return 'ACTIVE';
  }
};

export const canTransitionStatus = (currentStatus: UserStatus, newStatus: UserStatus): boolean => {
  // All status transitions are allowed for now
  // In the future, you might want to restrict certain transitions
  return currentStatus !== newStatus;
};

export const formatUserForDisplay = (user: any): User => {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    registrationDate: user.created_at,
    updatedAt: user.updated_at,
    lastLogin: user.last_login,
    documentCount: user.document_count || 0
  };
};

export const buildUserQuery = (filters: UserFilters): { whereClause: string; params: any[] } => {
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (filters.search) {
    whereClause += ' AND (name LIKE ? OR email LIKE ? OR username LIKE ?)';
    const searchPattern = `%${filters.search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (filters.role) {
    whereClause += ' AND role = ?';
    params.push(filters.role);
  }

  if (filters.status) {
    whereClause += ' AND status = ?';
    params.push(filters.status);
  }

  return { whereClause, params };
};