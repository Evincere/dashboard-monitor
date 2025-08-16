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
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '12');
    const searchQuery = searchParams.get('search');
    const circunscripcionFilter = searchParams.get('circunscripcion');
    const statusFilter = searchParams.get('status');
    const getAllDNIs = searchParams.get('getAllDNIs') === 'true';

    const token = generateAdminToken();

    // Fetch users and inscriptions from backend
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

    // If only DNI list is requested
    if (getAllDNIs) {
      const eligibleUserIds = new Set(eligibleInscriptions.map((ins: any) => ins.userId));
      const eligibleUsers = usersData.filter((user: any) => eligibleUserIds.has(user.id));
      const allDNIs = eligibleUsers.map((user: any) => user.dni).sort();
      
      return NextResponse.json({
        success: true,
        allDNIs
      });
    }

    const eligibleUserIds = new Set(eligibleInscriptions.map((ins: any) => ins.userId));
    const eligibleUsers = usersData.filter((user: any) => eligibleUserIds.has(user.id));

    // Apply filters
    let filteredUsers = eligibleUsers;

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filteredUsers = filteredUsers.filter((user: any) => {
        return (
          user.dni?.toLowerCase().includes(searchLower) ||
          user.fullName?.toLowerCase().includes(searchLower) ||
          user.firstName?.toLowerCase().includes(searchLower) ||
          user.lastName?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)
        );
      });
    }

    if (circunscripcionFilter) {
      filteredUsers = filteredUsers.filter((user: any) => {
        const inscription = eligibleInscriptions.find((ins: any) => ins.userId === user.id);
        const centro = inscription?.centroDeVida?.toLowerCase() || '';
        
        if (circunscripcionFilter === 'PRIMERA_CIRCUNSCRIPCION') return centro.includes('primera');
        if (circunscripcionFilter === 'SEGUNDA_CIRCUNSCRIPCION') return centro.includes('segunda');
        if (circunscripcionFilter === 'TERCERA_CIRCUNSCRIPCION') return centro.includes('tercera');
        if (circunscripcionFilter === 'CUARTA_CIRCUNSCRIPCION') return centro.includes('cuarta');
        
        return true;
      });
    }

    // Calculate pagination
    const totalElements = filteredUsers.length;
    const totalPages = Math.ceil(totalElements / size);
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Transform to expected format
    const postulants = paginatedUsers.map((user: any) => {
      const inscription = eligibleInscriptions.find((ins: any) => ins.userId === user.id);
      
      // Determine circunscripcion
      let circunscripcion = 'PRIMERA_CIRCUNSCRIPCION';
      if (inscription?.centroDeVida) {
        const centro = inscription.centroDeVida.toLowerCase();
        if (centro.includes('primera')) circunscripcion = 'PRIMERA_CIRCUNSCRIPCION';
        else if (centro.includes('segunda')) circunscripcion = 'SEGUNDA_CIRCUNSCRIPCION';
        else if (centro.includes('tercera')) circunscripcion = 'TERCERA_CIRCUNSCRIPCION';
        else if (centro.includes('cuarta')) circunscripcion = 'CUARTA_CIRCUNSCRIPCION';
      }

      // Simplified validation status
      let validationStatus = 'PENDING';
      if (inscription?.state === 'APPROVED') validationStatus = 'APPROVED';
      else if (inscription?.state === 'REJECTED') validationStatus = 'REJECTED';

      return {
        dni: user.dni,
        fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        circunscripcion,
        inscriptionState: inscription?.state || 'COMPLETED_WITH_DOCS',
        validationStatus,
        documentsCount: 5, // Simplified
        contestInfo: {
          title: 'Concurso Multifuero MPD',
          position: 'Magistrado/a'
        },
        inscriptionDate: inscription?.createdAt || new Date().toISOString(),
        lastValidated: undefined,
        validatedBy: undefined
      };
    });

    // Calculate statistics
    const statistics = {
      totalApplicants: totalElements,
      pending: postulants.filter(p => p.validationStatus === 'PENDING').length,
      approved: postulants.filter(p => p.validationStatus === 'APPROVED').length,
      rejected: postulants.filter(p => p.validationStatus === 'REJECTED').length,
      inReview: postulants.filter(p => p.validationStatus === 'IN_REVIEW').length
    };

    return NextResponse.json({
      success: true,
      postulants,
      pagination: {
        page,
        size,
        totalElements,
        totalPages
      },
      statistics
    });

  } catch (error) {
    console.error('Postulants API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
