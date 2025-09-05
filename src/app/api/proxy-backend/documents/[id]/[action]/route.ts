import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import backendClient from '@/lib/backend-client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dashboard-session');

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: 'No autorizado', message: 'Sesión no encontrada' },
        { status: 401 }
      );
    }

    const { motivo } = await request.json();
    const { id, action } = await params;
    console.log("🔍 Debug endpoint [action] - Datos recibidos:", { id, action, motivo, motivoType: typeof motivo });

    const sessionData = JSON.parse(sessionCookie.value);
    
    // Use backend client with session token
    backendClient.setAuthToken(sessionData.token);

    // Validar motivo para acción de reject
    if (action === "reject" && (!motivo || motivo.trim() === "")) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", message: "Se requiere un motivo para rechazar el documento" },
        { status: 400 }
      );
    }

    let response;
    switch (action) {
      case 'reject':
        response = await backendClient.rejectDocument(id, motivo);
        break;
      case 'approve':
        response = await backendClient.approveDocument(id);
        break;
      case 'revert':
        response = await backendClient.revertDocument(id);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Acción no válida', message: `Acción "${action}" no reconocida` },
          { status: 400 }
        );
    }

    if (!response.success) {
      console.error(`Error en ${action} de documento: ${response.status}`, response.error);
      return NextResponse.json(
        { 
          success: false, 
          error: response.error || 'Error al procesar el documento',
          message: response.message || `Error al realizar ${action} del documento`
        },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json({ success: true, data: response.data });
  } catch (error: unknown) {
    console.error('Error en validación de documento:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', message: errorMessage },
      { status: 500 }
    );
  }
}
