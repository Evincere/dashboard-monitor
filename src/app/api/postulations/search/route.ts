import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * API de búsqueda específica para postulaciones
 * Busca en toda la base de datos por DNI, nombre o email
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

        resolve(cleanResult);
      });
    });
  } catch (error) {
    console.error('Error in getRealCentroDeVida:', error);
    return '';
  }
}

// Función para calcular estadísticas de documentos
async function calculateDocumentsStats(userId: string): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  required: number;
  completionPercentage: number;
  validationStatus: string;
}> {
  try {
    const documentsResponse = await backendClient.getDocuments({
      usuario: userId,
      size: 100
    });

    if (!documentsResponse.success) {
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        required: 0,
        completionPercentage: 0,
        validationStatus: 'PENDING'
      };
    }

    const documents = documentsResponse.data?.content || [];

    // Tipos de documentos obligatorios
    const REQUIRED_DOCUMENT_TYPES = [
      'DNI_FRONTAL',
      'DNI_DORSO',
      'TITULO_UNIVERSITARIO_Y_CERTIFICADO_ANALITICO',
      'ANTECEDENTES_PENALES',
      'CERTIFICADO_SIN_SANCIONES',
      'CERTIFICADO_PROFESIONAL_ANTIGUEDAD',
      'CONSTANCIA_CUIL'
    ];

    const stats = {
      total: documents.length,
      pending: documents.filter(d => d.estado === 'PENDING').length,
      approved: documents.filter(d => d.estado === 'APPROVED').length,
      rejected: documents.filter(d => d.estado === 'REJECTED').length,
      required: 0,
      completionPercentage: 0,
      validationStatus: 'PENDING'
    };

    // Calcular documentos requeridos y progreso
    const requiredDocs = documents.filter(doc => {
      const docType = doc.tipoDocumento?.code || '';
      return REQUIRED_DOCUMENT_TYPES.includes(docType);
    });

    stats.required = requiredDocs.length;

    // Calcular progreso basado en TODOS los documentos
    const validatedDocs = documents.filter(doc => doc.estado !== 'PENDING').length;
    stats.completionPercentage = documents.length > 0 ? Math.round((validatedDocs / documents.length) * 100) : 0;

    // Determinar estado de validación
    if (requiredDocs.length > 0) {
      const approvedRequired = requiredDocs.filter(doc => doc.estado === 'APPROVED').length;
      const rejectedRequired = requiredDocs.filter(doc => doc.estado === 'REJECTED').length;

      if (rejectedRequired > 0) {
        stats.validationStatus = 'REJECTED';
      } else if (approvedRequired === requiredDocs.length) {
        stats.validationStatus = 'COMPLETED';
      } else if (approvedRequired > 0) {
        stats.validationStatus = 'PARTIAL';
      } else {
        stats.validationStatus = 'PENDING';
      }
    } else {
      const approved = documents.filter(doc => doc.estado === 'APPROVED').length;
      const rejected = documents.filter(doc => doc.estado === 'REJECTED').length;

      if (rejected > 0) stats.validationStatus = 'REJECTED';
      else if (approved === documents.length) stats.validationStatus = 'COMPLETED';
      else if (approved > 0) stats.validationStatus = 'PARTIAL';
      else stats.validationStatus = 'PENDING';
    }

    return stats;
  } catch (error) {
    console.error(`Error calculating documents stats for user ${userId}:`, error);
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      required: 0,
      completionPercentage: 0,
      validationStatus: 'PENDING'
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('search') || '';
    const statusFilter = searchParams.get('statusFilter') || '';
    const validationFilter = searchParams.get('validationFilter') || '';
    const sortBy = searchParams.get('sortBy') || 'PRIORITY';

    console.log(`🔍 SEARCH API - Term: "${searchTerm}", Status: "${statusFilter}", Validation: "${validationFilter}"`);

    if (!searchTerm.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Search term is required',
        postulations: []
      }, { status: 400 });
    }

    const searchTermLower = searchTerm.toLowerCase().trim();

    // Obtener TODAS las inscripciones para búsqueda completa
    const inscriptionsResponse = await backendClient.getInscriptions({ 
      size: 1000 // Obtener todas las inscripciones
    });

    if (!inscriptionsResponse.success) {
      throw new Error('Failed to fetch inscriptions from backend');
    }

    const allInscriptions = inscriptionsResponse.data?.content || [];
    console.log(`📋 Got ${allInscriptions.length} total inscriptions for search`);

    // Filtrar inscripciones ACTIVAS (excluirlas del resultado)
    let filteredInscriptions = allInscriptions.filter(inscription => 
      inscription.state !== 'ACTIVE'
    );

    // 🔍 BÚSQUEDA: Filtrar por término de búsqueda
    const matchingInscriptions = filteredInscriptions.filter(inscription => {
      if (!inscription.userInfo) return false;

      const dni = (inscription.userInfo.dni || '').toLowerCase();
      const fullName = (inscription.userInfo.fullName || '').toLowerCase();
      const email = (inscription.userInfo.email || '').toLowerCase();

      return dni.includes(searchTermLower) || 
             fullName.includes(searchTermLower) || 
             email.includes(searchTermLower);
    });

    console.log(`🎯 Found ${matchingInscriptions.length} matching inscriptions for term "${searchTerm}"`);

    // Aplicar filtros adicionales si se proporcionan
    let finalInscriptions = matchingInscriptions;

    if (statusFilter && statusFilter !== 'ALL') {
      finalInscriptions = finalInscriptions.filter(inscription => 
        inscription.state === statusFilter
      );
      console.log(`📝 After status filter (${statusFilter}): ${finalInscriptions.length} results`);
    }

    // Para el filtro de validación, necesitaremos procesar los documentos
    // Por ahora, limitamos a primeros 20 resultados para performance
    const limitedResults = finalInscriptions.slice(0, 20);
    console.log(`⚡ Processing first ${limitedResults.length} results for performance`);

    // Procesar postulaciones encontradas
    const postulations = [];

    for (const inscription of limitedResults) {
      try {
        if (!inscription.userInfo?.dni) continue;

        const dni = inscription.userInfo.dni;

        // Obtener centro de vida real
        const realCentroDeVida = await getRealCentroDeVida(inscription.id);

        // Obtener estadísticas reales de documentos
        const documentsStats = await calculateDocumentsStats(inscription.userId);

        // Aplicar filtro de validación si se especifica
        if (validationFilter && validationFilter !== 'ALL') {
          if (documentsStats.validationStatus !== validationFilter) {
            continue; // Saltar esta postulación
          }
        }

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
            selectedCircunscripciones: inscription.selectedCircunscripciones || [],
            createdAt: inscription.inscriptionDate
          },
          contest: {
            title: inscription.contestInfo?.title || 'Concurso Multifuero MPD',
            position: inscription.contestInfo?.position || 'Magistrado/a'
          },
          documents: {
            total: documentsStats.total,
            pending: documentsStats.pending,
            approved: documentsStats.approved,
            rejected: documentsStats.rejected,
            required: documentsStats.required,
            types: []
          },
          validationStatus: documentsStats.validationStatus,
          priority: 'MEDIUM',
          completionPercentage: documentsStats.completionPercentage
        };

        postulations.push(postulation);

      } catch (error) {
        console.error(`Error processing inscription ${inscription.id} in search:`, error);
      }
    }

    // Ordenar resultados
    switch (sortBy) {
      case 'PRIORITY':
        const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        postulations.sort((a, b) => priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder]);
        break;
      case 'COMPLETION':
        postulations.sort((a, b) => a.completionPercentage - b.completionPercentage);
        break;
      case 'NAME':
        postulations.sort((a, b) => a.user.fullName.localeCompare(b.user.fullName));
        break;
      case 'DATE':
        postulations.sort((a, b) => new Date(b.inscription.createdAt || new Date()).getTime() - new Date(a.inscription.createdAt || new Date()).getTime());
        break;
    }

    console.log(`✅ Search completed: ${postulations.length} postulations found for "${searchTerm}"`);

    return NextResponse.json({
      success: true,
      postulations,
      searchTerm,
      totalMatches: matchingInscriptions.length,
      processedResults: postulations.length,
      filters: {
        statusFilter: statusFilter || 'ALL',
        validationFilter: validationFilter || 'ALL',
        sortBy
      },
      timestamp: new Date().toISOString(),
      source: 'search-api'
    });

  } catch (error) {
    console.error('❌ Search API error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown search error',
      postulations: [],
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
