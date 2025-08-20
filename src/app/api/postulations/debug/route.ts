import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('search') || '';
    
    // Obtener token de autenticación del backend
    const loginResponse = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (!loginResponse.ok) {
      throw new Error('Failed to authenticate with backend');
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    // Obtener inscripciones del backend
    const inscriptionsResponse = await fetch('http://localhost:8080/api/admin/inscriptions?size=20', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const inscriptionsData = await inscriptionsResponse.json();
    const allInscriptions = inscriptionsData.content || [];
    
    // Simular la lógica de filtrado del frontend
    let filtered = allInscriptions;
    
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(inscription => 
        inscription.userInfo?.dni?.toLowerCase().includes(searchLower) ||
        inscription.userInfo?.fullName?.toLowerCase().includes(searchLower) ||
        inscription.userInfo?.email?.toLowerCase().includes(searchLower)
      );
    }
    
    const debug = {
      searchTerm,
      totalInscriptions: allInscriptions.length,
      filteredCount: filtered.length,
      sampleData: allInscriptions.slice(0, 3).map(i => ({
        dni: i.userInfo?.dni,
        fullName: i.userInfo?.fullName,
        email: i.userInfo?.email,
        state: i.state
      })),
      searchResults: filtered.map(i => ({
        dni: i.userInfo?.dni,
        fullName: i.userInfo?.fullName,
        email: i.userInfo?.email,
        state: i.state
      }))
    };

    return NextResponse.json({
      success: true,
      debug,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
