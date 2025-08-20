import { NextRequest, NextResponse } from 'next/server';

// ====================================================================
// MAPEO MEJORADO DE CIRCUNSCRIPCIONES - 2025-08-19
// ====================================================================

const mapearCircunscripcionReal = (inscription: any): string => {
  // 1. Usar selectedCircunscripciones si existe y tiene datos
  if (inscription.selectedCircunscripciones && inscription.selectedCircunscripciones.length > 0) {
    const primera = inscription.selectedCircunscripciones.find((c: string) => c.toLowerCase().includes('primera'));
    if (primera) return 'PRIMERA_CIRCUNSCRIPCION';
    
    const segunda = inscription.selectedCircunscripciones.find((c: string) => c.toLowerCase().includes('segunda'));
    if (segunda) return 'SEGUNDA_CIRCUNSCRIPCION';
    
    const tercera = inscription.selectedCircunscripciones.find((c: string) => c.toLowerCase().includes('tercera'));
    if (tercera) return 'TERCERA_CIRCUNSCRIPCION';
    
    const cuarta = inscription.selectedCircunscripciones.find((c: string) => c.toLowerCase().includes('cuarta'));
    if (cuarta) return 'CUARTA_CIRCUNSCRIPCION';
  }
  
  // 2. Fallback: analizar centroDeVida
  if (inscription.centroDeVida) {
    const centro = inscription.centroDeVida.toLowerCase();
    
    // Segunda circunscripción (San Rafael, Alvear, Malargüe)
    if (centro.includes('san rafael') || centro.includes('alvear') || centro.includes('malargüe') || centro.includes('malargue')) {
      return 'SEGUNDA_CIRCUNSCRIPCION';
    }
    
    // Tercera circunscripción (San Martín, Rivadavia, Junín, Santa Rosa)
    if (centro.includes('san martín') || centro.includes('san martin') || centro.includes('rivadavia') || 
        centro.includes('junín') || centro.includes('junin') || centro.includes('santa rosa')) {
      return 'TERCERA_CIRCUNSCRIPCION';
    }
    
    // Cuarta circunscripción (Tunuyán, Tupungato, San Carlos)
    if (centro.includes('tunuyán') || centro.includes('tunuyan') || centro.includes('tupungato') || centro.includes('san carlos')) {
      return 'CUARTA_CIRCUNSCRIPCION';
    }
    
    // Primera circunscripción (Capital, Guaymallén, Maipú, Las Heras, Godoy Cruz, Luján)
    if (centro.includes('ciudad') || centro.includes('mendoza') || centro.includes('capital') || 
        centro.includes('guaymallén') || centro.includes('guaymallen') || centro.includes('maipú') || centro.includes('maipu') ||
        centro.includes('las heras') || centro.includes('godoy cruz') || centro.includes('luján') || centro.includes('lujan')) {
      return 'PRIMERA_CIRCUNSCRIPCION';
    }
  }
  
  // 3. Default fallback
  return 'PRIMERA_CIRCUNSCRIPCION';
};


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Query must be at least 2 characters long'
      }, { status: 400 });
    }

    console.log('🔍 Quick Search Request:', { query, limit });

    // Login to get token (exactly like test-backend)
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

    // Search in users with the query parameter
    const userParams = new URLSearchParams({
      query: query.trim(),
      size: (limit * 3).toString() // Get more results to filter for eligible users
    });

    const usersResponse = await fetch(`http://localhost:8080/api/users?${userParams}`, {
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

    const usersData = await usersResponse.json();
    
    // Search in inscriptions for eligible users
    const inscriptionsResponse = await fetch('http://localhost:8080/api/admin/inscriptions?size=500', {
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

    // Get eligible users (COMPLETED_WITH_DOCS state)
    const eligibleInscriptions = inscriptionsData.content.filter((inscription: any) => 
      inscription.state === 'COMPLETED_WITH_DOCS'
    );

    // Create a map of eligible user IDs
    const eligibleUserIds = new Set(eligibleInscriptions.map((ins: any) => ins.userId));

    // Filter search results to only include eligible users
    const eligibleUsers = usersData.content.filter((user: any) => 
      eligibleUserIds.has(user.id)
    );

    // Create inscription map for faster lookup
    const inscriptionsByUser = eligibleInscriptions.reduce((acc: any, ins: any) => {
      acc[ins.userId] = ins;
      return acc;
    }, {});

    // Transform and limit results
    const results = eligibleUsers.slice(0, limit).map((user: any) => {
      const inscription = inscriptionsByUser[user.id];
      
      // Determine circunscripcion usando datos reales del backend
      const circunscripcion = mapearCircunscripcionReal(inscription);

      // Map backend state to validation status
      let validationStatus = 'PENDING';
      if (inscription?.state === 'APPROVED') validationStatus = 'APPROVED';
      else if (inscription?.state === 'REJECTED') validationStatus = 'REJECTED';
      else if (inscription?.state === 'PENDING') validationStatus = 'IN_REVIEW';

      return {
        dni: user.dni || 'N/A',
        fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sin nombre',
        email: user.email || 'Sin email',
        circunscripcion,
        validationStatus,
        contestInfo: {
          title: 'Concurso Multifuero MPD',
          position: 'Magistrado/a'
        }
      };
    });

    console.log('✅ Quick Search Response:', {
      query,
      totalEligibleUsers: eligibleUsers.length,
      resultsReturned: results.length
    });

    return NextResponse.json({
      success: true,
      results,
      total: eligibleUsers.length,
      limit: limit,
      query: query
    });

  } catch (error) {
    console.error('❌ Search API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
