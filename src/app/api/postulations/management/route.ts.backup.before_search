import { NextRequest, NextResponse } from 'next/server';

/**
 * API simplificada para gestión de postulaciones
 * Usa directamente la API del backend con toda la información incluida
 */

// Función para obtener centro de vida desde base de datos MySQL
async function getRealCentroDeVida(inscriptionId: string): Promise<string> {
  try {
    if (!inscriptionId) return '';
    
    const cleanUUID = inscriptionId.replace(/-/g, '').toLowerCase();
    const { exec } = require('child_process');
    
    // Usar docker exec para acceder al contenedor MySQL
    const query = `docker exec mpd-concursos-mysql mysql -u root -proot1234 -D mpd_concursos -s -N -e "SELECT centro_de_vida FROM inscriptions WHERE id = UNHEX('${cleanUUID}');" 2>/dev/null`;
    
    return new Promise((resolve) => {
      exec(query, (error: any, stdout: string) => {
        if (error) {
          console.warn(`Error getting centro_de_vida for ${cleanUUID}:`, error.message);
          resolve('');
          return;
        }
        
        const result = stdout.trim();
        if (!result) {
          console.warn(`No centro_de_vida found for ${cleanUUID}`);
          resolve('');
          return;
        }
        
        // Limpiar encoding
        const cleanResult = result
          .replace(/Ã¡/g, 'á')
          .replace(/Ã©/g, 'é')
          .replace(/Ã³/g, 'ó')
          .replace(/Ãº/g, 'ú')
          .replace(/Ã±/g, 'ñ')
          .replace(/Ã/g, 'í')
          .replace(/N�/g, 'N°')
          .replace(/Luj�n/g, 'Luján')
          .replace(/�/g, 'á')
          .replace(/Â°/g, '°');
          
        console.log(`✅ Centro de vida obtenido para ${cleanUUID}: "${cleanResult}"`);
        resolve(cleanResult);
      });
    });
  } catch (error) {
    console.error('Error in getRealCentroDeVida:', error);
    return '';
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '15');
    const onlyStats = searchParams.get('onlyStats') === 'true';
    
    console.log(`🔄 Postulations management - Page ${page}, Size ${pageSize}`);

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
    const inscriptionsResponse = await fetch('http://localhost:8080/api/admin/inscriptions?size=1000', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!inscriptionsResponse.ok) {
      throw new Error('Failed to fetch inscriptions from backend');
    }
    
    const inscriptionsData = await inscriptionsResponse.json();
    const allInscriptions = inscriptionsData.content || [];
    
    console.log(`📋 Got ${allInscriptions.length} inscriptions from backend`);
    
    // Estadísticas
    const stats = {
      total: allInscriptions.length,
      completedWithDocs: allInscriptions.filter(i => i.state === 'COMPLETED_WITH_DOCS').length,
      validationPending: allInscriptions.filter(i => ['ACTIVE', 'COMPLETED_WITH_DOCS', 'PENDING'].includes(i.state)).length,
      validationCompleted: allInscriptions.filter(i => i.state === 'APPROVED').length,
      validationRejected: allInscriptions.filter(i => i.state === 'REJECTED').length
    };
    
    if (onlyStats) {
      return NextResponse.json({
        success: true,
        postulations: [],
        stats,
        pagination: { page: 0, pageSize: 0, totalItems: stats.total, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
        timestamp: new Date().toISOString(),
        source: 'simplified-stats'
      });
    }
    
    // Paginación
    const totalPages = Math.ceil(allInscriptions.length / pageSize);
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedInscriptions = allInscriptions.slice(startIndex, endIndex);
    
    console.log(`📄 Processing ${paginatedInscriptions.length} inscriptions for page ${page}`);
    
    // Procesar postulaciones
    const postulations = [];
    
    for (const inscription of paginatedInscriptions) {
      try {
        if (!inscription.userInfo?.dni) {
          console.warn(`Skipping inscription ${inscription.id} - no DNI`);
          continue;
        }
        
        const dni = inscription.userInfo.dni;
        console.log(`📄 Processing ${dni}...`);
        
        // Obtener centro de vida real
        const realCentroDeVida = await getRealCentroDeVida(inscription.id);
        
        const postulation = {
          id: inscription.id,
          user: {
            dni: dni,
            fullName: inscription.userInfo.fullName,
            email: inscription.userInfo.email
          },
          inscription: {
            id: inscription.id,
            state: inscription.state,
            centroDeVida: realCentroDeVida || 'Sin especificar',
            createdAt: inscription.inscriptionDate
          },
          contest: {
            title: inscription.contestInfo?.title || 'Concurso Multifuero MPD',
            position: inscription.contestInfo?.position || 'Magistrado/a'
          },
          documents: {
            total: 7,
            pending: 7,
            approved: 0,
            rejected: 0,
            required: 7,
            types: []
          },
          validationStatus: 'PENDING',
          priority: 'MEDIUM',
          completionPercentage: 0
        };
        
        postulations.push(postulation);
        console.log(`✅ Added postulation for ${dni} with centro de vida: "${realCentroDeVida}"`);
        
      } catch (error) {
        console.error(`Error processing inscription ${inscription.id}:`, error);
      }
    }
    
    console.log(`✅ Successfully processed ${postulations.length} postulations`);

    return NextResponse.json({
      success: true,
      postulations,
      stats,
      pagination: {
        page,
        pageSize,
        totalItems: allInscriptions.length,
        totalPages,
        hasNextPage: page < totalPages - 1,
        hasPreviousPage: page > 0
      },
      timestamp: new Date().toISOString(),
      source: 'simplified-api-with-real-centro-vida'
    });

  } catch (error) {
    console.error('❌ Postulations management API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
