import { executeQuerySingle } from '@/lib/db/mysql';
import { decode } from 'jsonwebtoken';

export interface Session {
    userId: string;
    role: string;
    exp: number;
}

interface SessionRow {
    id: string;
    user_id: string;
    expires_at: Date;
    role: string;
}

export async function getSessionToken(token: string): Promise<Session | null> {
    try {
        const decoded = decode(token) as { sub: string } | null;
        if (!decoded?.sub) {
            return null;
        }

        // Query for session with user data
        const session = await executeQuerySingle<SessionRow>(`
            SELECT 
                s.id,
                s.user_id,
                s.expires_at,
                u.role
            FROM sessions s
            JOIN user_entity u ON s.user_id = u.id
            WHERE s.id = ? AND s.expires_at > NOW()
        `, [decoded.sub]);

        if (!session) {
            return null;
        }

        return {
            userId: session.user_id,
            role: session.role,
            exp: new Date(session.expires_at).getTime()
        };
    } catch (error) {
        console.error('Error al validar sesión:', error);
        return null;
    }
}
