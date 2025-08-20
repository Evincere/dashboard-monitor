import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

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

    console.log('🔍 Validation search request:', { query, limit });

    // Search in users using the robust backend client
    const [usersResponse, inscriptionsResponse] = await Promise.all([
      backendClient.getUsers({ size: 1000 }),
      backendClient.getInscriptions({ size: 1000 })
    ]);

    if (!usersResponse.success || !inscriptionsResponse.success) {
      console.error('Backend search error:', {
        users: usersResponse.error,
        inscriptions: inscriptionsResponse.error
      });
      
      // Return empty results with fallback message
      return NextResponse.json({
        success: true,
        results: [],
        total: 0,
        limit: limit,
        query: query,
        message: 'Búsqueda temporalmente no disponible',
        fallback: true
      });
    }

    const usersData = usersResponse.data?.content || [];
    const inscriptionsData = inscriptionsResponse.data?.content || [];

    // Get eligible inscriptions - estados que requieren validación
    const validationStates = ['COMPLETED_WITH_DOCS', 'PENDING', 'APPROVED', 'REJECTED'];
    const eligibleInscriptions = inscriptionsData.filter((inscription: any) => 
      validationStates.includes(inscription.status || inscription.state)
    );

    // Create a map of eligible user IDs
    const eligibleUserIds = new Set(eligibleInscriptions.map((ins: any) => ins.userId));

    // Filter eligible users and perform manual search
    const searchTermLower = query.toLowerCase();
    const filteredUsers = usersData.filter((user: any) => 
      eligibleUserIds.has(user.id) && (
        user.dni?.toLowerCase().includes(searchTermLower) ||
        user.fullName?.toLowerCase().includes(searchTermLower) ||
        user.firstName?.toLowerCase().includes(searchTermLower) ||
        user.lastName?.toLowerCase().includes(searchTermLower) ||
        user.email?.toLowerCase().includes(searchTermLower)
      )
    );

    // Combine with inscription data and format results
    const results = filteredUsers.slice(0, limit).map((user: any) => {
      const inscription = eligibleInscriptions.find((ins: any) => ins.userId === user.id);
      
      // Map contest info
      const contestInfo = {
        title: inscription?.contest?.title || 'Concurso Multifuero MPD',
        position: inscription?.contest?.position || 'Magistrado/a'
      };

      // Map circunscripcion from contest or inscription
      let circunscripcion = 'NO_ESPECIFICADA';
      if (inscription?.contest?.circunscripcion) {
        circunscripcion = inscription.contest.circunscripcion;
      } else if (inscription?.centroDeVida) {
        // Try to map centroDeVida to circunscripcion
        const centro = inscription.centroDeVida.toLowerCase();
        if (centro.includes('primera')) circunscripcion = 'PRIMERA_CIRCUNSCRIPCION';
        else if (centro.includes('segunda')) circunscripcion = 'SEGUNDA_CIRCUNSCRIPCION';
        else if (centro.includes('tercera')) circunscripcion = 'TERCERA_CIRCUNSCRIPCION';
        else if (centro.includes('cuarta')) circunscripcion = 'CUARTA_CIRCUNSCRIPCION';
        else circunscripcion = 'PRIMERA_CIRCUNSCRIPCION'; // Default fallback
      }

      // Determine validation status
      const inscriptionState = inscription?.status || inscription?.state;
      let validationStatus = 'PENDING';
      if (inscriptionState === 'APPROVED') validationStatus = 'APPROVED';
      else if (inscriptionState === 'REJECTED') validationStatus = 'REJECTED';
      else if (inscriptionState === 'IN_REVIEW') validationStatus = 'IN_REVIEW';

      return {
        dni: user.dni,
        fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        circunscripcion,
        validationStatus,
        contestInfo
      };
    });

    console.log(`✅ Search found ${results.length} results for query: "${query}"`);

    return NextResponse.json({
      success: true,
      results,
      total: filteredUsers.length,
      limit: limit,
      query: query
    });

  } catch (error) {
    console.error('Search API error:', error);
    
    // Return empty results with error message
    return NextResponse.json({
      success: true,
      results: [],
      total: 0,
      limit: parseInt(new URL(request.url).searchParams.get('limit') || '10'),
      query: new URL(request.url).searchParams.get('q'),
      message: 'Error en la búsqueda - intente nuevamente',
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}