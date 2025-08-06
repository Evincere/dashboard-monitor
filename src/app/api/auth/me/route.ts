// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/services/database';
import { withAuth, withSecurityHeaders, withCORS, type AuthenticatedRequest } from '@/lib/middleware';
import type { RowDataPacket } from 'mysql2';

async function meHandler(request: AuthenticatedRequest) {
  try {
    if (!request.user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const connection = await getDatabaseConnection();

    // Get current user details
    const [userResult] = await connection.execute(
      `SELECT 
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
      WHERE id = UNHEX(REPLACE(?, "-", ""))`,
      [request.user.userId]
    ) as [RowDataPacket[], any];

    if (userResult.length === 0) {
      connection.release();
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const user = userResult[0];

    // Get user statistics
    const [statsResult] = await connection.execute(
      `SELECT 
        COUNT(DISTINCT d.id) as document_count,
        COUNT(DISTINCT al.id) as login_count
      FROM users u
      LEFT JOIN documents d ON d.user_id = u.id
      LEFT JOIN audit_logs al ON al.user_id = u.id AND al.event = 'USER_LOGIN_SUCCESS'
      WHERE u.id = UNHEX(REPLACE(?, "-", ""))`,
      [request.user.userId]
    ) as [RowDataPacket[], any];

    const stats = statsResult[0] || { document_count: 0, login_count: 0 };

    connection.release();

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login,
        statistics: {
          documentCount: parseInt(stats.document_count) || 0,
          loginCount: parseInt(stats.login_count) || 0
        }
      },
      permissions: {
        canViewUsers: request.user.role === 'ROLE_ADMIN',
        canEditUsers: request.user.role === 'ROLE_ADMIN',
        canViewDocuments: true,
        canEditDocuments: request.user.role === 'ROLE_ADMIN',
        canViewBackups: request.user.role === 'ROLE_ADMIN',
        canCreateBackups: request.user.role === 'ROLE_ADMIN',
        canViewAuditLogs: request.user.role === 'ROLE_ADMIN'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { error: 'Failed to get user profile', code: 'PROFILE_ERROR' },
      { status: 500 }
    );
  }
}

export const GET = withSecurityHeaders(
  withCORS(
    withAuth(meHandler)
  )
);