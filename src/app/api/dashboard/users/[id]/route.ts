// src/app/api/dashboard/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/services/database';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { z } from 'zod';

const UserUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50).optional(),
  email: z.string().email('Invalid email format').max(255).optional(),
  role: z.enum(['ROLE_ADMIN', 'ROLE_USER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional()
});

// Simple cache management
const cache = new Map<string, any>();

function clearUserCache(): void {
  const keysToDelete = Array.from(cache.keys()).filter(key => key.startsWith('users-'));
  keysToDelete.forEach(key => cache.delete(key));
  cache.delete('dashboard-users');
}

// GET - Fetch single user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const connection = await getDatabaseConnection();

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
      WHERE HEX(id) = ?`,
      [id]
    ) as [RowDataPacket[], any];

    connection.release();

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult[0];
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        registrationDate: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch user',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const validatedData = UserUpdateSchema.parse(body);

    if (Object.keys(validatedData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const connection = await getDatabaseConnection();

    // Check if user exists
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE HEX(id) = ?',
      [id]
    ) as [RowDataPacket[], any];

    if (existingUser.length === 0) {
      connection.release();
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check for username/email conflicts if they're being updated
    if (validatedData.username || validatedData.email) {
      let conflictQuery = 'SELECT id FROM users WHERE (';
      const conflictParams: any[] = [];
      const conditions: string[] = [];

      if (validatedData.username) {
        conditions.push('username = ?');
        conflictParams.push(validatedData.username);
      }

      if (validatedData.email) {
        conditions.push('email = ?');
        conflictParams.push(validatedData.email);
      }

      conflictQuery += conditions.join(' OR ') + ') AND HEX(id) != ?';
      conflictParams.push(id);

      const [conflictResult] = await connection.execute(conflictQuery, conflictParams) as [RowDataPacket[], any];

      if (conflictResult.length > 0) {
        connection.release();
        return NextResponse.json(
          { error: 'Username or email already exists' },
          { status: 409 }
        );
      }
    }

    // Build update query
    const updateFields: string[] = [];
    const updateParams: any[] = [];

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateParams.push(value);
      }
    });

    updateFields.push('updated_at = NOW()');
    updateParams.push(id);

    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE HEX(id) = ?`;

    const [result] = await connection.execute(updateQuery, updateParams) as [ResultSetHeader, any];

    connection.release();
    clearUserCache();

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'User not found or no changes made' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'User updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating user:', error);
    
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
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const connection = await getDatabaseConnection();

    // Check if user exists
    const [existingUser] = await connection.execute(
      'SELECT id, name FROM users WHERE HEX(id) = ?',
      [id]
    ) as [RowDataPacket[], any];

    if (existingUser.length === 0) {
      connection.release();
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user (in production, consider soft delete)
    const [result] = await connection.execute(
      'DELETE FROM users WHERE HEX(id) = ?',
      [id]
    ) as [ResultSetHeader, any];

    connection.release();
    clearUserCache();

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'User deleted successfully',
      deletedUser: existingUser[0].name,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete user',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// PATCH - Toggle user status (activate/deactivate)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!['activate', 'deactivate', 'block'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be activate, deactivate, or block' },
        { status: 400 }
      );
    }

    const connection = await getDatabaseConnection();

    // Check if user exists
    const [existingUser] = await connection.execute(
      'SELECT id, status FROM users WHERE HEX(id) = ?',
      [id]
    ) as [RowDataPacket[], any];

    if (existingUser.length === 0) {
      connection.release();
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Determine new status
    let newStatus: string;
    switch (action) {
      case 'activate':
        newStatus = 'ACTIVE';
        break;
      case 'deactivate':
        newStatus = 'INACTIVE';
        break;
      case 'block':
        newStatus = 'BLOCKED';
        break;
      default:
        newStatus = 'ACTIVE';
    }

    // Update user status
    const [result] = await connection.execute(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE HEX(id) = ?',
      [newStatus, id]
    ) as [ResultSetHeader, any];

    connection.release();
    clearUserCache();

    return NextResponse.json({
      message: `User ${action}d successfully`,
      previousStatus: existingUser[0].status,
      newStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      {
        error: 'Failed to update user status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}