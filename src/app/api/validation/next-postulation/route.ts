import { NextRequest, NextResponse } from 'next/server';

/**
 * API para obtener la próxima postulación pendiente de validación
 * FIXED: Uses direct backend authentication instead of backend-client
 */

interface User {
  id: string;
  dni: string;
  fullName?: string;
  email?: string;
}

interface UserResponse {
  content: User[];
  totalElements: number;
}

interface Inscription {
  id: string;
  state: string;
  userId: string;
  createdAt?: string;
  userInfo?: {
    dni: string;
    fullName?: string;
    email?: string;
  };
}

interface EnrichedInscription extends Inscription {
  userInfo: {
    dni: string;
    fullName?: string;
    email?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currentDni = searchParams.get('currentDni');
    const excludeStatesParam = searchParams.get('excludeStates') || '';
    const excludeStates = excludeStatesParam.split(',').filter(Boolean);

    console.log(`🔍 Buscando próxima postulación. Current DNI: ${currentDni}, Exclude: ${excludeStates.join(',')}`);

    // Login to get token (same pattern as working endpoints)
    const loginResponse = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful for next-postulation endpoint');

    // Obtener todas las inscripciones directamente del backend
    const inscriptionsResponse = await fetch('http://localhost:8080/api/admin/inscriptions?size=1000', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      }
    });

    if (!inscriptionsResponse.ok) {
      const errorText = await inscriptionsResponse.text();
      throw new Error(`Failed to fetch inscriptions: ${inscriptionsResponse.status} - ${errorText}`);
    }

    const inscriptionsData = await inscriptionsResponse.json();
    const allInscriptions = inscriptionsData.content || [];

    console.log(`📋 Total inscriptions fetched: ${allInscriptions.length}`);

    // Obtener usuarios para mapear DNIs
    const usersResponse = await fetch('http://localhost:8080/api/users?size=1000', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      }
    });

    if (!usersResponse.ok) {
      const errorText = await usersResponse.text();
      throw new Error(`Failed to fetch users: ${usersResponse.status} - ${errorText}`);
    }

    const usersData: UserResponse = await usersResponse.json();
    console.log(`👥 Total users fetched: ${usersData.totalElements}`);

    // Estados válidos para validación
    const validStates = ['COMPLETED_WITH_DOCS', 'PENDING'];

    // Filtrar inscripciones válidas con información de usuario
    let validInscriptions: EnrichedInscription[] = allInscriptions.filter((inscription: Inscription): boolean => {
      // Debe estar en estados válidos para validación
      if (!validStates.includes(inscription.state)) return false;

      // Buscar información del usuario
      const user = usersData.content.find((u: User): boolean => u.id === inscription.userId);
      if (!user || !user.dni) return false;

      // No debe estar en estados excluidos
      if (excludeStates.length > 0 && excludeStates.includes(inscription.state)) return false;

      // No debe ser la postulación actual
      if (currentDni && user.dni === currentDni) return false;

      return true;
    }).map((inscription: Inscription): EnrichedInscription => {
      const user = usersData.content.find((u: User): boolean => u.id === inscription.userId);
      return {
        ...inscription,
        userInfo: {
          dni: user!.dni,
          fullName: user!.fullName,
          email: user!.email
        }
      };
    });

    console.log(`🔍 Encontradas ${validInscriptions.length} inscripciones válidas para validación`);

    if (validInscriptions.length === 0) {
      // Si no hay más, buscar sin excluir la actual
      validInscriptions = allInscriptions.filter((inscription: Inscription): boolean => {
        const user = usersData.content.find((u: User): boolean => u.id === inscription.userId);
        if (!user?.dni) return false;
        if (!validStates.includes(inscription.state)) return false;
        return true;
      }).map((inscription: Inscription): EnrichedInscription => {
        const user = usersData.content.find((u: User): boolean => u.id === inscription.userId);
        if (!user) throw new Error(`User not found for inscription ${inscription.id}`);
        return {
          ...inscription,
          userInfo: {
            dni: user.dni,
            fullName: user.fullName,
            email: user.email
          }
        };
      });

      if (validInscriptions.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No hay más postulaciones pendientes de validación',
          hasNext: false,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Ordenar por fecha de inscripción (más antigua primero)
    validInscriptions.sort((a, b) =>
      new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime()
    );

    const nextInscription = validInscriptions[0];

    console.log(`✅ Próxima postulación: ${nextInscription.userInfo.dni} (${nextInscription.state})`);

    return NextResponse.json({
      success: true,
      hasNext: true,
      dni: nextInscription.userInfo.dni,
      postulant: {
        dni: nextInscription.userInfo.dni,
        fullName: nextInscription.userInfo.fullName,
        email: nextInscription.userInfo.email
      },
      inscription: {
        id: nextInscription.id,
        state: nextInscription.state,
        createdAt: nextInscription.createdAt
      },
      totalPending: validInscriptions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting next postulation:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
