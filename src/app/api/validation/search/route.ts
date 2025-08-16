import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8080/api';
const JWT_SECRET = process.env.BACKEND_JWT_SECRET || 'RcmUR2yePNGr5pjZ9bXL_dx7h_xeIliI4iS4ESXDMMs';

// Generate admin token
function generateAdminToken(): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    sub: 'admin',
    authorities: ['ROLE_ADMIN', 'ROLE_USER'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');

  return `${base64Header}.${base64Payload}.${signature}`;
}

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

    const token = generateAdminToken();

    // Search in users
    const usersResponse = await fetch(`${BACKEND_API_URL}/admin/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!usersResponse.ok) {
      throw new Error('Failed to fetch users from backend');
    }

    const usersData = await usersResponse.json();
    
    // Search in inscriptions for apt users
    const inscriptionsResponse = await fetch(`${BACKEND_API_URL}/admin/inscriptions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!inscriptionsResponse.ok) {
      throw new Error('Failed to fetch inscriptions from backend');
    }

    const inscriptionsData = await inscriptionsResponse.json();

    // Get eligible users (COMPLETED_WITH_DOCS state)
    const eligibleInscriptions = inscriptionsData.filter((inscription: any) => 
      inscription.state === 'COMPLETED_WITH_DOCS'
    );

    // Create a map of eligible user IDs
    const eligibleUserIds = new Set(eligibleInscriptions.map((ins: any) => ins.userId));

    // Filter and search users
    const eligibleUsers = usersData.filter((user: any) => 
      eligibleUserIds.has(user.id)
    );

    // Perform search
    const searchTermLower = query.toLowerCase();
    const filteredUsers = eligibleUsers.filter((user: any) => {
      return (
        user.dni?.toLowerCase().includes(searchTermLower) ||
        user.fullName?.toLowerCase().includes(searchTermLower) ||
        user.firstName?.toLowerCase().includes(searchTermLower) ||
        user.lastName?.toLowerCase().includes(searchTermLower) ||
        user.email?.toLowerCase().includes(searchTermLower)
      );
    });

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

      // Determine validation status (simplified logic)
      let validationStatus = 'PENDING';
      if (inscription?.state === 'APPROVED') validationStatus = 'APPROVED';
      else if (inscription?.state === 'REJECTED') validationStatus = 'REJECTED';
      else if (inscription?.state === 'IN_REVIEW') validationStatus = 'IN_REVIEW';

      return {
        dni: user.dni,
        fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        circunscripcion,
        validationStatus,
        contestInfo
      };
    });

    return NextResponse.json({
      success: true,
      results,
      total: filteredUsers.length,
      limit: limit,
      query: query
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
