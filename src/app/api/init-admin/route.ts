import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/services/database';
import { hashPassword } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const connection = await getDatabaseConnection();

    // Create users table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id BINARY(16) NOT NULL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'ROLE_USER',
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        last_login TIMESTAMP NULL,
        failed_login_attempts INT DEFAULT 0,
        locked_until TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Check if admin user already exists
    const [existingUsers] = await connection.execute(
      'SELECT email FROM users WHERE email = ?',
      ['admin@mpd.com']
    );

    if ((existingUsers as any[]).length > 0) {
      connection.release();
      return NextResponse.json({
        success: true,
        message: 'Admin user already exists',
        existing: true
      });
    }

    // Create admin user
    const userId = uuidv4().replace(/-/g, '');
    const hashedPassword = await hashPassword('admin123');

    await connection.execute(`
      INSERT INTO users (id, name, username, email, password, role, status, created_at, updated_at)
      VALUES (UNHEX(?), ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      userId,
      'Admin User',
      'admin',
      'admin@mpd.com',
      hashedPassword,
      'ROLE_ADMIN',
      'ACTIVE'
    ]);

    connection.release();

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      userId: userId
    });

  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create admin user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
