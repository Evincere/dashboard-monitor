// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/services/database';
import { LoginSchema, verifyPassword, generateAccessToken, generateRefreshToken, createSession } from '@/lib/auth';
import { auditLogger } from '@/lib/audit-logger';
import { withRateLimit, authRateLimit } from '@/lib/rate-limiter';
import { withSecurityHeaders, withCORS } from '@/lib/middleware';
import { getClientIP, getUserAgent } from '@/lib/request-utils';
import type { RowDataPacket } from 'mysql2';

async function loginHandler(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = LoginSchema.parse(body);

        const connection = await getDatabaseConnection();

        // Get user by email
        const [userResult] = await connection.execute(
            `SELECT 
        HEX(id) as id,
        name,
        username,
        email,
        password,
        role,
        status,
        last_login,
        failed_login_attempts,
        locked_until
      FROM users 
      WHERE email = ?`,
            [email]
        ) as [RowDataPacket[], any];

        if (userResult.length === 0) {
            await auditLogger.logSecurityEvent({
                event: 'LOGIN_FAILED_USER_NOT_FOUND',
                ipAddress: getClientIP(request),
                userAgent: getUserAgent(request),
                metadata: { email },
                timestamp: new Date()
            });

            return NextResponse.json(
                { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
                { status: 401 }
            );
        }

        const user = userResult[0];

        // Check if account is locked
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            await auditLogger.logSecurityEvent({
                event: 'LOGIN_FAILED_ACCOUNT_LOCKED',
                userId: user.id,
                ipAddress: getClientIP(request),
                userAgent: getUserAgent(request),
                metadata: { email, lockedUntil: user.locked_until },
                timestamp: new Date()
            });

            return NextResponse.json(
                {
                    error: 'Account is temporarily locked due to multiple failed login attempts',
                    code: 'ACCOUNT_LOCKED',
                    lockedUntil: user.locked_until
                },
                { status: 423 }
            );
        }

        // Check if account is active
        if (user.status !== 'ACTIVE') {
            await auditLogger.logSecurityEvent({
                event: 'LOGIN_FAILED_ACCOUNT_INACTIVE',
                userId: user.id,
                ipAddress: getClientIP(request),
                userAgent: getUserAgent(request),
                metadata: { email, status: user.status },
                timestamp: new Date()
            });

            return NextResponse.json(
                {
                    error: 'Account is not active',
                    code: 'ACCOUNT_INACTIVE',
                    status: user.status
                },
                { status: 403 }
            );
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, user.password);

        if (!isValidPassword) {
            // Increment failed login attempts
            const failedAttempts = (user.failed_login_attempts || 0) + 1;
            const lockUntil = failedAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null; // Lock for 30 minutes after 5 failed attempts

            await connection.execute(
                'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = UNHEX(REPLACE(?, "-", ""))',
                [failedAttempts, lockUntil, user.id]
            );

            await auditLogger.logSecurityEvent({
                event: 'LOGIN_FAILED_INVALID_PASSWORD',
                userId: user.id,
                ipAddress: getClientIP(request),
                userAgent: getUserAgent(request),
                metadata: {
                    email,
                    failedAttempts,
                    accountLocked: lockUntil !== null
                },
                timestamp: new Date()
            });

            return NextResponse.json(
                { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
                { status: 401 }
            );
        }

        // Reset failed login attempts and update last login
        await connection.execute(
            'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = UNHEX(REPLACE(?, "-", ""))',
            [user.id]
        );

        connection.release();

        // Generate tokens
        const accessToken = generateAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role
        });

        const refreshToken = generateRefreshToken(user.id);

        // Create session
        createSession(
            {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status
            },
            getClientIP(request),
            getUserAgent(request)
        );

        // Log successful login
        await auditLogger.logActivity({
            event: 'USER_LOGIN_SUCCESS',
            userId: user.id,
            userRole: user.role,
            ipAddress: getClientIP(request),
            userAgent: getUserAgent(request),
            path: '/api/auth/login',
            method: 'POST',
            responseStatus: 200,
            timestamp: new Date()
        });

        const response = NextResponse.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                lastLogin: new Date().toISOString()
            },
            accessToken,
            refreshToken,
            expiresIn: '24h'
        });

        // Set secure HTTP-only cookies
        response.cookies.set('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 // 24 hours
        });

        response.cookies.set('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 // 7 days
        });

        return response;

    } catch (error) {
        console.error('Login error:', error);

        await auditLogger.logSecurityEvent({
            event: 'LOGIN_ERROR',
            ipAddress: getClientIP(request),
            userAgent: getUserAgent(request),
            metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
            timestamp: new Date()
        });

        if (error instanceof Error && 'errors' in error) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: (error as any).errors
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Login failed', code: 'LOGIN_ERROR' },
            { status: 500 }
        );
    }
}

export const POST = withSecurityHeaders(
    withCORS(
        withRateLimit(authRateLimit)(loginHandler)
    )
);