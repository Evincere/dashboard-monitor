// src/app/api/dashboard/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/services/database';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { z } from 'zod';

// User validation schemas
const UserCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ROLE_ADMIN', 'ROLE_USER']).default('ROLE_USER'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).default('ACTIVE')
});

const UserUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50).optional(),
  email: z.string().email('Invalid email format').max(255).optional(),
  role: z.enum(['ROLE_ADMIN', 'ROLE_USER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional()
});

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

// GET - Fetch users with search and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const statsOnly = searchParams.get('stats') === 'true';

    // If requesting stats only, return cached statistics
    if (statsOnly) {
      const cacheKey = 'dashboard-users';
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return NextResponse.json({
          ...cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      const connection = await getDatabaseConnection();

      // Execute optimized queries for user statistics
      const [
        totalUsersResult,
        activeUsersResult,
        usersByRoleResult,
        usersByStatusResult,
        recentUsersResult,
        userGrowthResult
      ] = await Promise.all([
        connection.execute('SELECT COUNT(*) as total FROM users') as Promise<[RowDataPacket[], any]>,
        connection.execute(`
          SELECT COUNT(*) as total 
          FROM users 
          WHERE status = 'ACTIVE'
        `) as Promise<[RowDataPacket[], any]>,
        connection.execute(`
          SELECT 
            role,
            COUNT(*) as count
          FROM users 
          GROUP BY role
          ORDER BY count DESC
        `) as Promise<[RowDataPacket[], any]>,
        connection.execute(`
          SELECT 
            status,
            COUNT(*) as count
          FROM users 
          GROUP BY status
          ORDER BY count DESC
        `) as Promise<[RowDataPacket[], any]>,
        connection.execute(`
          SELECT COUNT(*) as total
          FROM users 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `) as Promise<[RowDataPacket[], any]>,
        connection.execute(`
          SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            COUNT(*) as count
          FROM users 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          GROUP BY DATE_FORMAT(created_at, '%Y-%m')
          ORDER BY month ASC
        `) as Promise<[RowDataPacket[], any]>
      ]);

      connection.release();

      const userStats = {
        total: totalUsersResult[0][0]?.total || 0,
        active: activeUsersResult[0][0]?.total || 0,
        recent: recentUsersResult[0][0]?.total || 0,
        byRole: usersByRoleResult[0].map(row => ({
          role: row.role,
          count: row.count
        })),
        byStatus: usersByStatusResult[0].map(row => ({
          status: row.status,
          count: row.count
        })),
        growth: userGrowthResult[0].map(row => ({
          month: row.month,
          count: row.count
        }))
      };

      setCachedData(cacheKey, userStats);
      return NextResponse.json({
        ...userStats,
        cached: false,
        timestamp: new Date().toISOString()
      });
    }

    // Build cache key for user list
    const cacheKey = `users-${search}-${role}-${status}-${page}-${limit}`;
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
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ? OR username LIKE ?)';
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    if (role) {
      whereClause += ' AND role = ?';
      queryParams.push(role);
    }

    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const [countResult] = await connection.execute(countQuery, queryParams) as [RowDataPacket[], any];
    const total = countResult[0]?.total || 0;

    // Get users with pagination
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
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [usersResult] = await connection.execute(usersQuery, [...queryParams, limit, offset]) as [RowDataPacket[], any];
    
    connection.release();

    const users = usersResult.map(user => ({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      registrationDate: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_login
    }));

    const result = {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };

    setCachedData(cacheKey, result);

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
export async function POST(request: NextRequest) {
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

    // Insert new user (password should be hashed in production)
    const [result] = await connection.execute(
      `INSERT INTO users (id, name, username, email, password, role, status, created_at, updated_at) 
       VALUES (UUID_TO_BIN(UUID()), ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        validatedData.name,
        validatedData.username,
        validatedData.email,
        validatedData.password, // In production, hash this password
        validatedData.role,
        validatedData.status
      ]
    ) as [ResultSetHeader, any];

    connection.release();
    clearUserCache();

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