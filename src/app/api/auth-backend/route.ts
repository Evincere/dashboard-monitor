import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://vps-4778464-x.dattaweb.com/api';

// Credenciales admin para el backend principal
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Auth-backend endpoint called');
    
    // Obtener token del backend principal
    const backendResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ADMIN_CREDENTIALS),
    });

    console.log('📡 Backend auth response:', backendResponse.status);

    if (!backendResponse.ok) {
      console.error('❌ Error al autenticar con backend:', backendResponse.status);
      return NextResponse.json({
        success: false,
        message: `Error al autenticar con el backend: ${backendResponse.status}`
      }, { status: 500 });
    }

    const backendData = await backendResponse.json();
    console.log('✅ Backend auth successful:', { hasToken: !!backendData.token });

    return NextResponse.json({
      success: true,
      token: backendData.token,
      username: backendData.username,
      authorities: backendData.authorities,
      message: 'Autenticación exitosa'
    });

  } catch (error) {
    console.error('💥 Error en auth-backend:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}
