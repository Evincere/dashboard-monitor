import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * API simplificada para gestión de postulaciones
 * Usa backendClient para obtener datos consistentes con el endpoint individual
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

// Función para calcular estadísticas de documentos usando backendClient
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
      usuarioId: userId,
      size: 100
    });

    if (!documentsResponse.success) {
      console.warn(`Failed to fetch documents for user ${userId}`);
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

    // Calcular progreso basado en TODOS los documentos (obligatorios + opcionales)
    // Progreso = documentos validados (APPROVED + REJECTED) / total documentos
    const validatedDocs = documents.filter(doc => doc.estado !== 'PENDING').length;
    stats.completionPercentage = documents.length > 0 ? Math.round((validatedDocs / documents.length) * 100) : 0;

    // Para determinar el STATUS, usar solo documentos requeridos
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
      // Si no hay documentos obligatorios, basarse en todos los documentos
      const approved = documents.filter(doc => doc.estado === 'APPROVED').length;
      const rejected = documents.filter(doc => doc.estado === 'REJECTED').length;

      if (rejected > 0) stats.validationStatus = 'REJECTED';
      else if (approved === documents.length) stats.validationStatus = 'COMPLETED';
      else if (approved > 0) stats.validationStatus = 'PARTIAL';
      else stats.validationStatus = 'PENDING';
    }

    console.log(`📊 Documents stats for user ${userId}: ${stats.approved}/${stats.required} approved (${stats.completionPercentage}%)`);

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
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get("pageSize") || "300");
    const onlyStats = searchParams.get('onlyStats') === 'true';

    console.log(`🔄 Postulations management - Page ${page}, Size ${pageSize}`);

    // Obtener inscripciones usando backendClient
    const inscriptionsResponse = await backendClient.getInscriptions({ size: 1000 });

    if (!inscriptionsResponse.success) {
      throw new Error('Failed to fetch inscriptions from backend');
    }

    const allInscriptions = inscriptionsResponse.data?.content || [];


    // Filtrar usuarios ACTIVE
    const filteredInscriptions = allInscriptions.filter(inscription => inscription.state !== 'ACTIVE');
    console.log(`🔍 Filtradas ${allInscriptions.length - filteredInscriptions.length} inscripciones ACTIVE`);
    const allInscriptions_filtered = filteredInscriptions;

    console.log(`📋 Got ${allInscriptions_filtered.length} inscriptions from backend`);

    // Estadísticas
    const stats = {
      total: allInscriptions.length,
      completedWithDocs: allInscriptions_filtered.filter(i => i.state === 'COMPLETED_WITH_DOCS').length,
      validationPending: allInscriptions_filtered.filter(i => i.state && ['ACTIVE', 'COMPLETED_WITH_DOCS', 'PENDING'].includes(i.state)).length,
      validationCompleted: allInscriptions_filtered.filter(i => i.state === 'APPROVED').length,
      validationRejected: allInscriptions_filtered.filter(i => i.state === 'REJECTED').length
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
    const totalPages = Math.ceil(allInscriptions_filtered.length / pageSize);
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedInscriptions = allInscriptions_filtered.slice(startIndex, endIndex);

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

        // Obtener estadísticas reales de documentos
        const documentsStats = await calculateDocumentsStats(inscription.userId);

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
        console.log(`✅ Added postulation for ${dni} with ${documentsStats.completionPercentage}% completion`);

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
      source: 'backend-client-with-real-progress'
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