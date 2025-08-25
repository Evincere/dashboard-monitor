import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { executeQuerySingle } from '@/lib/db/mysql';
import { getSessionToken, Session } from './session';

interface UserRow {
    id: string;
    email: string;
    role: string;
}

export async function withAuth(
    handler: (req: NextRequest, userId: string) => Promise<NextResponse>,
    req: NextRequest
): Promise<NextResponse> {
    try {
        // Obtener la cookie de sesión
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session-token')?.value;

        if (!sessionToken) {
            console.error('No session token found');
            return NextResponse.json(
                { error: 'No autorizado - token no encontrado' },
                { status: 401 }
            );
        }

        // Validar la sesión usando el módulo de sesión
        const session = await getSessionToken(sessionToken);

        if (!session) {
            console.error('Invalid or expired session');
            return NextResponse.json(
                { error: 'No autorizado - sesión inválida o expirada' },
                { status: 401 }
            );
        }

        // Verificar usuario
        const user = await executeQuerySingle<UserRow>(`
            SELECT id, email, role
            FROM user_entity 
            WHERE id = ?
        `, [session.userId]);

        if (!user) {
            console.error('User not found:', session.userId);
            return NextResponse.json(
                { error: 'No autorizado - usuario no encontrado' },
                { status: 401 }
            );
        }

        return await handler(req, user.id);
    } catch (error) {
        console.error('Error en autenticación:', error);
        return NextResponse.json(
            { error: 'Error de autenticación' },
            { status: 401 }
        );
    }
}
