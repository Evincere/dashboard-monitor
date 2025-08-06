// src/lib/auth.ts
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// Validation schemas
export const LoginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
});

export const RegisterSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    email: z.string().email('Invalid email format').max(255),
    password: z.string().min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
            'Password must contain uppercase, lowercase, number and special character'),
    role: z.enum(['ROLE_ADMIN', 'ROLE_USER']).default('ROLE_USER')
});

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
}

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
}

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
    return bcrypt.compare(password, hashedPassword);
};

// JWT token utilities
export const generateAccessToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
    return jwt.sign(payload, JWT_SECRET as string, {
        expiresIn: JWT_EXPIRES_IN as string | number,
        issuer: 'dashboard-monitor',
        audience: 'mpd-concursos'
    });
};

export const generateRefreshToken = (userId: string): string => {
    return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET as string, {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN as string | number,
        issuer: 'dashboard-monitor',
        audience: 'mpd-concursos'
    });
};

export const verifyAccessToken = (token: string): JWTPayload | null => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET as string, {
            issuer: 'dashboard-monitor',
            audience: 'mpd-concursos'
        }) as JWTPayload;
        return decoded;
    } catch (error) {
        console.error('JWT verification failed:', error);
        return null;
    }
};

export const verifyRefreshToken = (token: string): { userId: string } | null => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET as string, {
            issuer: 'dashboard-monitor',
            audience: 'mpd-concursos'
        }) as any;

        if (decoded.type !== 'refresh') {
            return null;
        }

        return { userId: decoded.userId };
    } catch (error) {
        console.error('Refresh token verification failed:', error);
        return null;
    }
};

// Token extraction from headers
export const extractTokenFromHeader = (authHeader: string | null): string | null => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
};

// Session management
export interface UserSession {
    userId: string;
    email: string;
    role: string;
    loginTime: Date;
    lastActivity: Date;
    ipAddress?: string;
    userAgent?: string;
}

const activeSessions = new Map<string, UserSession>();

export const createSession = (user: AuthUser, ipAddress?: string, userAgent?: string): string => {
    const sessionId = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role
    });

    activeSessions.set(sessionId, {
        userId: user.id,
        email: user.email,
        role: user.role,
        loginTime: new Date(),
        lastActivity: new Date(),
        ipAddress,
        userAgent
    });

    return sessionId;
};

export const getSession = (token: string): UserSession | null => {
    return activeSessions.get(token) || null;
};

export const updateSessionActivity = (token: string): void => {
    const session = activeSessions.get(token);
    if (session) {
        session.lastActivity = new Date();
    }
};

export const destroySession = (token: string): void => {
    activeSessions.delete(token);
};

export const cleanupExpiredSessions = (): void => {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [token, session] of activeSessions.entries()) {
        if (now.getTime() - session.lastActivity.getTime() > maxAge) {
            activeSessions.delete(token);
        }
    }
};

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// Role-based access control
export const hasRole = (userRole: string, requiredRole: string): boolean => {
    const roleHierarchy = {
        'ROLE_ADMIN': 2,
        'ROLE_USER': 1
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userLevel >= requiredLevel;
};

export const requireRole = (userRole: string, requiredRole: string): boolean => {
    if (!hasRole(userRole, requiredRole)) {
        throw new Error(`Access denied. Required role: ${requiredRole}`);
    }
    return true;
};