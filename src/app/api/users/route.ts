// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/services/database';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { UserCreateSchema, buildUserQuery, formatUserForDisplay, type UserFilters } from '@/lib/user-validation';
import { withAuth, withAdmin, withSecurityHeaders, withCORS, type AuthenticatedRequest } from '@/lib/middleware';
import { withRateLimit, apiRateLimit } from '@/lib/rate-limiter';
import { auditLogger } from '@/lib/audit-logger';
import { hashPassword } from '@/lib/auth';
import { maskSensitiveData } from '@/lib/encryption';
import { z } from 'zod';

// Simple in-memory cache
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

function getCachedData(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

function clearUserCache(): void {
  const keysToDelete = Array.from(cache.keys()).filter(key => key.startsWith('users-'));
  keysToDelete.forEach(key => cache.delete(key));
  cache.delete('dashboard-users');
}

// GET - Fetch users with advanced search and filtering
async function getUsersHandler(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100); // Max 100 per page
    const offset = (page - 1) * limit;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'DESC';

    // Validate sort parameters
    const validSortFields = ['name', 'username', 'email', 'role', 'status', 'created_at', 'updated_at'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const finalSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Build cache key
    const cacheKey = `users-${search}-${role}-${status}-${page}-${limit}-${finalSortBy}-${finalSortOrder}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const connection = await getDatabaseConnection();

    // Build WHERE clause for filtering
    const filters: UserFilters = { search, role, status };
    const { whereClause, params: queryParams } = buildUserQuery(filters);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const [countResult] = await connection.execute(countQuery, queryParams) as [RowDataPacket[], any];
    const total = countResult[0]?.total || 0;

    // Get users with pagination and sorting
    const usersQuery = `
      SELECT 
        HEX(id) as id,
        name,
        username,
        email,
        role,
        status,
        created_at,
        updated_at,
        last_login
      FROM users 
      ${whereClause}
      ORDER BY ${finalSortBy} ${finalSortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const [usersResult] = await connection.execute(usersQuery, [...queryParams, limit, offset]) as [RowDataPacket[], any];
    
    connection.release();

    const users = usersResult.map(formatUserForDisplay);

    const result = {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      filters: {
        search,
        role,
        status,
        sortBy: finalSortBy,
        sortOrder: finalSortOrder
      }
    };

    setCachedData(cacheKey, result);

    // Import utility functions
    const { getClientIP, getUserAgent } = await import('@/lib/request-utils');
    
    // Log user access
    await auditLogger.logActivity({
      event: 'USERS_LIST_ACCESSED',
      userId: request.user?.userId,
      userRole: request.user?.role,
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
      path: '/api/users',
      method: 'GET',
      responseStatus: 200,
      timestamp: new Date(),
      metadata: { filters: maskSensitiveData(filters) }
    });

    return NextResponse.json({
      ...result,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST - Create new user
async function createUserHandler(request: AuthenticatedRequest) {
  try {
    const body = await request.json();
    const validatedData = UserCreateSchema.parse(body);

    const connection = await getDatabaseConnection();

    // Check if username or email already exists
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [validatedData.username, validatedData.email]
    ) as [RowDataPacket[], any];

    if (existingUser.length > 0) {
      connection.release();
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 409 }
      );
    }

    // Hash password before storing
    const hashedPassword = await hashPassword(validatedData.password);

    // Insert new user
    const [result] = await connection.execute(
      `INSERT INTO users (id, name, username, email, password, role, status, created_at, updated_at) 
       VALUES (UUID_TO_BIN(UUID()), ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        validatedData.name,
        validatedData.username,
        validatedData.email,
        hashedPassword,
        validatedData.role,
        validatedData.status
      ]
    ) as [ResultSetHeader, any];

    connection.release();
    clearUserCache();

    // Import utility functions
    const { getClientIP, getUserAgent } = await import('@/lib/request-utils');
    
    // Log user creation
    await auditLogger.logActivity({
      event: 'USER_CREATED',
      userId: request.user?.userId,
      userRole: request.user?.role,
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
      path: '/api/users',
      method: 'POST',
      requestBody: maskSensitiveData(validatedData),
      responseStatus: 201,
      timestamp: new Date(),
      metadata: { createdUserId: result.insertId }
    });

    return NextResponse.json(
      {
        message: 'User created successfully',
        userId: result.insertId,
        timestamp: new Date().toISOString()
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Export secured endpoints
export const GET = withSecurityHeaders(
  withCORS(
    withRateLimit(apiRateLimit)(
      withAuth(getUsersHandler)
    )
  )
);

export const POST = withSecurityHeaders(
  withCORS(
    withRateLimit(apiRateLimit)(
      withAdmin(createUserHandler)
    )
  )
);