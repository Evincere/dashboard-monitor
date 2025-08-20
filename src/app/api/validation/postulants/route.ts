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
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '12');
    const searchQuery = searchParams.get('search');
    const circunscripcionFilter = searchParams.get('circunscripcion');
    const statusFilter = searchParams.get('status');
    const getAllDNIs = searchParams.get('getAllDNIs') === 'true';

    console.log('🔍 Validation Postulants Request:', {
      page, size, searchQuery, circunscripcionFilter, statusFilter, getAllDNIs
    });
    
    // Login to get token
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
    console.log('✅ Login successful');

    // FIXED: Fetch ALL users from backend (increase size to get all users)
    console.log('📡 Fetching all users from backend...');
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

    const usersData = await usersResponse.json();
    console.log('✅ Users fetched:', usersData.totalElements);
    
    // Fetch inscriptions from backend
    console.log('📡 Fetching inscriptions from backend...');
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
    console.log('✅ Inscriptions fetched:', inscriptionsData.totalElements);

    // Get eligible users (COMPLETED_WITH_DOCS state)
    const eligibleInscriptions = inscriptionsData.content.filter((inscription: any) => 
      inscription.state === 'COMPLETED_WITH_DOCS'
    );

    console.log('📊 Eligible inscriptions (COMPLETED_WITH_DOCS):', eligibleInscriptions.length);

    // If only DNI list is requested
    if (getAllDNIs) {
      const eligibleUserIds = new Set(eligibleInscriptions.map((ins: any) => ins.userId));
      const eligibleUsers = usersData.content.filter((user: any) => eligibleUserIds.has(user.id));
      const allDNIs = eligibleUsers.map((user: any) => user.dni).sort();
      
      return NextResponse.json({
        success: true,
        allDNIs
      });
    }

    const eligibleUserIds = new Set(eligibleInscriptions.map((ins: any) => ins.userId));
    const eligibleUsers = usersData.content.filter((user: any) => eligibleUserIds.has(user.id));

    console.log('📊 Eligible users:', eligibleUsers.length);

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
      console.log(`📊 After search filter (${searchQuery}):`, filteredUsers.length);
    }

    // FIXED: Add status filter logic
    if (statusFilter && statusFilter !== 'all') {
      filteredUsers = filteredUsers.filter((user: any) => {
        const inscription = eligibleInscriptions.find((ins: any) => ins.userId === user.id);
        if (!inscription) return false;
        
        let validationStatus = 'PENDING';
        if (inscription.state === 'APPROVED') validationStatus = 'APPROVED';
        else if (inscription.state === 'REJECTED') validationStatus = 'REJECTED';
        else if (inscription.state === 'PENDING') validationStatus = 'IN_REVIEW';
        
        return validationStatus === statusFilter;
      });
      console.log(`📊 After status filter (${statusFilter}):`, filteredUsers.length);
    }

    if (circunscripcionFilter && circunscripcionFilter !== 'all') {
      filteredUsers = filteredUsers.filter((user: any) => {
        const inscription = eligibleInscriptions.find((ins: any) => ins.userId === user.id);
        const centro = inscription?.centroDeVida?.toLowerCase() || '';
        
        if (circunscripcionFilter === 'PRIMERA_CIRCUNSCRIPCION') {
          return centro.includes('primera') || centro.includes('1°') || centro.includes('1') || 
                 centro.includes('capital') || centro.includes('mendoza');
        }
        if (circunscripcionFilter === 'SEGUNDA_CIRCUNSCRIPCION') {
          return centro.includes('segunda') || centro.includes('2°') || centro.includes('2') || 
                 centro.includes('san rafael');
        }
        if (circunscripcionFilter === 'TERCERA_CIRCUNSCRIPCION') {
          return centro.includes('tercera') || centro.includes('3°') || centro.includes('3') || 
                 centro.includes('san martin') || centro.includes('san martín');
        }
        if (circunscripcionFilter === 'CUARTA_CIRCUNSCRIPCION') {
          return centro.includes('cuarta') || centro.includes('4°') || centro.includes('4') || 
                 centro.includes('tunuyan') || centro.includes('tunuyán');
        }
        
        return true;
      });
      console.log(`📊 After circunscripcion filter (${circunscripcionFilter}):`, filteredUsers.length);
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
      
      // Determine circunscripcion usando datos reales del backend
      const circunscripcion = mapearCircunscripcionReal(inscription);

      // Map validation status
      let validationStatus = 'PENDING';
      if (inscription?.state === 'APPROVED') validationStatus = 'APPROVED';
      else if (inscription?.state === 'REJECTED') validationStatus = 'REJECTED';
      else if (inscription?.state === 'PENDING') validationStatus = 'IN_REVIEW';

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
        inscriptionDate: inscription?.inscriptionDate || new Date().toISOString(),
        lastValidated: inscription?.lastUpdated,
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

    console.log('✅ Validation Response:', {
      totalElements,
      totalPages,
      currentPage: page,
      resultsCount: paginatedUsers.length,
      statistics
    });

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
    console.error('❌ Postulants API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
