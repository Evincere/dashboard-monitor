import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '12');
    const searchQuery = searchParams.get('search');
    const circunscripcionFilter = searchParams.get('circunscripcion');
    const statusFilter = searchParams.get('status');
    const getAllDNIs = searchParams.get('getAllDNIs') === 'true';

    console.log('📋 Validation postulants API request:', {
      page, size, searchQuery, circunscripcionFilter, statusFilter, getAllDNIs
    });

    // Fetch users and inscriptions using the robust backend client
    const [usersResponse, inscriptionsResponse] = await Promise.all([
      backendClient.getUsers({ size: 1000 }), // Get all users
      backendClient.getInscriptions({ size: 1000 }) // Get all inscriptions
    ]);

    if (!usersResponse.success || !inscriptionsResponse.success) {
      console.error('Backend client error:', {
        users: usersResponse.error,
        inscriptions: inscriptionsResponse.error
      });
      
      // Return fallback data instead of error
      return NextResponse.json({
        success: true,
        postulants: [],
        pagination: { page, size, totalElements: 0, totalPages: 0 },
        statistics: { totalApplicants: 0, pending: 0, approved: 0, rejected: 0, inReview: 0 },
        message: 'Sistema temporalmente no disponible - conectividad limitada',
        fallback: true
      });
    }

    const usersData = usersResponse.data?.content || [];
    const inscriptionsData = inscriptionsResponse.data?.content || [];

    // Get eligible users - estados que requieren validación
    const validationStates = ['COMPLETED_WITH_DOCS', 'PENDING', 'APPROVED', 'REJECTED'];
    const eligibleInscriptions = inscriptionsData.filter((inscription: any) => 
      validationStates.includes(inscription.status || inscription.state)
    );

    console.log(`✅ Found ${eligibleInscriptions.length} eligible inscriptions from ${inscriptionsData.length} total`);

    // If only DNI list is requested
    if (getAllDNIs) {
      const eligibleUserIds = new Set(eligibleInscriptions.map((ins: any) => ins.userId));
      const eligibleUsers = usersData.filter((user: any) => eligibleUserIds.has(user.id));
      const allDNIs = eligibleUsers.map((user: any) => user.dni).filter(Boolean).sort();
      
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

    // Status filter
    if (statusFilter) {
      filteredUsers = filteredUsers.filter((user: any) => {
        const inscription = eligibleInscriptions.find((ins: any) => ins.userId === user.id);
        const inscriptionState = inscription?.status || inscription?.state;
        
        // Map frontend status to backend states
        if (statusFilter === 'PENDING') return ['COMPLETED_WITH_DOCS', 'PENDING'].includes(inscriptionState);
        if (statusFilter === 'APPROVED') return inscriptionState === 'APPROVED';
        if (statusFilter === 'REJECTED') return inscriptionState === 'REJECTED';
        if (statusFilter === 'IN_REVIEW') return inscriptionState === 'IN_REVIEW';
        
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

      // Map validation status
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
        inscriptionState: inscriptionState || 'COMPLETED_WITH_DOCS',
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

    console.log(`✅ Returning ${postulants.length} postulants (page ${page}/${totalPages})`);
    console.log('📊 Statistics:', statistics);

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
    
    // Return fallback data instead of error
    return NextResponse.json({
      success: true,
      postulants: [],
      pagination: {
        page: parseInt(new URL(request.url).searchParams.get('page') || '1'),
        size: parseInt(new URL(request.url).searchParams.get('size') || '12'),
        totalElements: 0,
        totalPages: 0
      },
      statistics: {
        totalApplicants: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        inReview: 0
      },
      message: 'Error temporal del sistema - por favor recargue la página',
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
