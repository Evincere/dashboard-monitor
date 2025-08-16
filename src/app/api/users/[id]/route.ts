// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/services/database';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { z } from 'zod';
// Note: Using simplified validation since user-validation lib might not exist
const UserUpdateSchema = z.object({
  name: z.string().optional(),
  username: z.string().optional(), 
  email: z.string().email().optional(),
  role: z.enum(['ROLE_ADMIN', 'ROLE_USER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional()
});

function validateUserAction(action: string): boolean {
  return ['activate', 'deactivate', 'block'].includes(action);
}

function getNewStatusFromAction(action: string): string {
  switch(action) {
    case 'activate': return 'ACTIVE';
    case 'deactivate': return 'INACTIVE';
    case 'block': return 'BLOCKED';
    default: return 'ACTIVE';
  }
}

// Simple cache management
const cache = new Map<string, any>();

function clearUserCache(): void {
  const keysToDelete = Array.from(cache.keys()).filter(key => key.startsWith('users-'));
  keysToDelete.forEach(key => cache.delete(key));
  cache.delete('dashboard-users');
}

// GET - Fetch single user by ID with documents count
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const connection = await getDatabaseConnection();

    // Get user details from user_entity table
    const [userResult] = await connection.execute(
      `SELECT 
        u.id,
        u.name,
        u.username,
        u.email,
        u.role,
        u.status,
        u.created_at,
        u.updated_at,
        u.last_login
      FROM user_entity u
      WHERE u.id = ?`,
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
      user: user,
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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
      'SELECT id, name FROM user_entity WHERE id = ?',
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
      let conflictQuery = 'SELECT id FROM user_entity WHERE (';
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

      conflictQuery += conditions.join(' OR ') + ') AND id != ?';
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

    const updateQuery = `UPDATE user_entity SET ${updateFields.join(', ')} WHERE id = ?`;

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
      updatedUser: existingUser[0].name,
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const connection = await getDatabaseConnection();

    // Check if user exists (simplified since user_entity doesn't have documents)
    const [existingUser] = await connection.execute(
      `SELECT u.id, u.name
       FROM user_entity u
       WHERE u.id = ?`,
      [id]
    ) as [RowDataPacket[], any];

    if (existingUser.length === 0) {
      connection.release();
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = existingUser[0];
    
    // Delete user (in production, consider soft delete)
    const [result] = await connection.execute(
      'DELETE FROM user_entity WHERE id = ?',
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
      deletedUser: user.name,
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

// PATCH - Toggle user status (activate/deactivate/block)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!validateUserAction(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be activate, deactivate, or block' },
        { status: 400 }
      );
    }

    const connection = await getDatabaseConnection();

    // Check if user exists
    const [existingUser] = await connection.execute(
      'SELECT id, name, status FROM user_entity WHERE id = ?',
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
    const newStatus = getNewStatusFromAction(action);

    // Don't update if status is already the same
    if (existingUser[0].status === newStatus) {
      connection.release();
      return NextResponse.json({
        message: `User is already ${newStatus.toLowerCase()}`,
        currentStatus: newStatus,
        timestamp: new Date().toISOString()
      });
    }

    // Update user status
    const [result] = await connection.execute(
      'UPDATE user_entity SET status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, id]
    ) as [ResultSetHeader, any];

    connection.release();
    clearUserCache();

    return NextResponse.json({
      message: `User ${action}d successfully`,
      userName: existingUser[0].name,
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