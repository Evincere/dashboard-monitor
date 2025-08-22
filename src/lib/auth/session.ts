import prisma from '@/lib/db';
import { decode, verify } from 'jsonwebtoken';

export interface Session {
    userId: string;
    role: string;
    exp: number;
}

export async function getSessionToken(token: string): Promise<Session | null> {
    try {
        const decoded = decode(token) as { sub: string } | null;
        if (!decoded?.sub) {
            return null;
        }

        const session = await prisma.session.findUnique({
            where: {
                id: decoded.sub,
                expiresAt: {
                    gt: new Date()
                }
            },
            include: {
                user: true
            }
        });

        if (!session) {
            return null;
        }

        return {
            userId: session.userId,
            role: session.user.role,
            exp: session.expiresAt.getTime()
        };
    } catch (error) {
        console.error('Error al validar sesión:', error);
        return null;
    }
}
