import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * API optimizada para gestión de postulaciones con caché y paralelización
 * Mejoras de rendimiento para evitar timeouts
 */

interface UserInfo {
  dni: string;
  fullName?: string;
  email?: string;
}

interface InscriptionDetails {
  id: string;
  state: string;
  centroDeVida: string;
  selectedCircunscripciones: string[];
  createdAt?: string;
}

interface ContestInfo {
  title: string;
  position: string;
}

interface DocumentStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  required: number;
  completionPercentage: number;
  validationStatus: string;
  types?: string[];
}

interface PostulationDocuments {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  required: number;
  types?: string[];
}

interface Postulation {
  id: string;
  user: UserInfo;
  inscription: InscriptionDetails;
  contest: ContestInfo;
  documents: PostulationDocuments;
}

// Cache simple en memoria
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Función optimizada para obtener centro de vida (con timeout y límite de reintentos)
async function getRealCentroDeVida(inscriptionId: string): Promise<string> {
  try {
    if (!inscriptionId) return '';

    const cleanUUID = inscriptionId.replace(/-/g, '').toLowerCase();
    const { exec } = require('child_process');

    // Query optimizada con timeout
    const query = `timeout 10s docker exec mpd-concursos-mysql mysql -u root -proot1234 -D mpd_concursos -s -N -e "SELECT COALESCE(centro_de_vida, '') FROM inscriptions WHERE id = UNHEX('${cleanUUID}') LIMIT 1;" 2>/dev/null`;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(''); // Timeout después de 15 segundos
      }, 15000);

      exec(query, { timeout: 10000 }, (error: any, stdout: string) => {
        clearTimeout(timeout);

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

        // Limpiar encoding de manera más eficiente
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

// Función optimizada para calcular estadísticas de documentos con caché
async function calculateDocumentsStatsOptimized(userId: string): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  required: number;
  completionPercentage: number;
  validationStatus: string;
}> {
  const cacheKey = `docs_${userId}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const documentsResponse = await Promise.race([
      backendClient.getDocuments({ usuario: userId, size: 100 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
    ]) as any;

    if (!documentsResponse.success) {
      const defaultStats = {
        total: 0, pending: 0, approved: 0, rejected: 0, required: 0,
        completionPercentage: 0, validationStatus: 'PENDING'
      };
      cache.set(cacheKey, { data: defaultStats, timestamp: Date.now() });
      return defaultStats;
    }

    const documents = documentsResponse.data?.content || [];

    const REQUIRED_DOCUMENT_TYPES = [
      'DNI_FRONTAL', 'DNI_DORSO', 'TITULO_UNIVERSITARIO_Y_CERTIFICADO_ANALITICO',
      'ANTECEDENTES_PENALES', 'CERTIFICADO_SIN_SANCIONES',
      'CERTIFICADO_PROFESIONAL_ANTIGUEDAD', 'CONSTANCIA_CUIL'
    ];

    const stats = {
      total: documents.length,
      pending: documents.filter((d: any) => d.estado === 'PENDING').length,
      approved: documents.filter((d: any) => d.estado === 'APPROVED').length,
      rejected: documents.filter((d: any) => d.estado === 'REJECTED').length,
      required: 0,
      completionPercentage: 0,
      validationStatus: 'PENDING' as string
    };

    const requiredDocs = documents.filter((doc: any) => {
      const docType = doc.tipoDocumento?.code || '';
      return REQUIRED_DOCUMENT_TYPES.includes(docType);
    });

    stats.required = requiredDocs.length;

    const validatedDocs = documents.filter((doc: any) => doc.estado !== 'PENDING').length;
    stats.completionPercentage = documents.length > 0 ? Math.round((validatedDocs / documents.length) * 100) : 0;

    if (requiredDocs.length > 0) {
      const approvedRequired = requiredDocs.filter((doc: any) => doc.estado === 'APPROVED').length;
      const rejectedRequired = requiredDocs.filter((doc: any) => doc.estado === 'REJECTED').length;

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
      const approved = documents.filter((doc: any) => doc.estado === 'APPROVED').length;
      const rejected = documents.filter((doc: any) => doc.estado === 'REJECTED').length;

      if (rejected > 0) stats.validationStatus = 'REJECTED';
      else if (approved === documents.length) stats.validationStatus = 'COMPLETED';
      else if (approved > 0) stats.validationStatus = 'PARTIAL';
      else stats.validationStatus = 'PENDING';
    }

    // Guardar en caché
    cache.set(cacheKey, { data: stats, timestamp: Date.now() });
    return stats;
  } catch (error) {
    console.error(`Error calculating documents stats for user ${userId}:`, error);
    const defaultStats = {
      total: 0, pending: 0, approved: 0, rejected: 0, required: 0,
      completionPercentage: 0, validationStatus: 'PENDING'
    };
    cache.set(cacheKey, { data: defaultStats, timestamp: Date.now() });
    return defaultStats;
  }
}

// Procesar postulación individual de manera optimizada
async function processInscriptionOptimized(inscription: any): Promise<Postulation | null> {
  try {
    if (!inscription.userInfo?.dni) {
      return null;
    }

    const dni = inscription.userInfo.dni;

    // Ejecutar operaciones en paralelo
    const [realCentroDeVida, documentsStats] = await Promise.all([
      getRealCentroDeVida(inscription.id),
      calculateDocumentsStatsOptimized(inscription.userId)
    ]);

    return {
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
      }
    };
  } catch (error) {
    console.error(`Error processing inscription ${inscription.id}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get("pageSize") || "50"); // Reducir tamaño por defecto
    const onlyStats = searchParams.get('onlyStats') === 'true';

    console.log(`🔄 Optimized Postulations management - Page ${page}, Size ${pageSize}`);

    // Cache para las inscripciones
    const cacheKey = `inscriptions_all`;
    const cached = cache.get(cacheKey);
    let allInscriptions;

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('📦 Using cached inscriptions');
      allInscriptions = cached.data;
    } else {
      console.log('🔍 Fetching inscriptions from backend');
      const inscriptionsResponse = await Promise.race([
        backendClient.getInscriptions({ size: 1000 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Backend timeout')), 15000))
      ]) as any;

      if (!inscriptionsResponse.success) {
        throw new Error('Failed to fetch inscriptions from backend');
      }

      allInscriptions = inscriptionsResponse.data?.content || [];
      cache.set(cacheKey, { data: allInscriptions, timestamp: Date.now() });
    }

    // Filtrar usuarios ACTIVE (más eficiente)
    const filteredInscriptions = allInscriptions.filter((inscription: any) => inscription.state !== 'ACTIVE');
    console.log(`🔍 Filtered ${allInscriptions.length - filteredInscriptions.length} ACTIVE inscriptions`);

    // Estadísticas (calculadas de manera más eficiente)
    const stats = {
      total: allInscriptions.length,
      completedWithDocs: filteredInscriptions.filter((i: any) => i.state === 'COMPLETED_WITH_DOCS').length,
      validationPending: filteredInscriptions.filter((i: any) => i.state && ['ACTIVE', 'COMPLETED_WITH_DOCS', 'PENDING'].includes(i.state)).length,
      validationCompleted: filteredInscriptions.filter((i: any) => i.state === 'APPROVED').length,
      validationRejected: filteredInscriptions.filter((i: any) => i.state === 'REJECTED').length
    };

    if (onlyStats) {
      console.log(`✅ Stats only completed in ${Date.now() - startTime}ms`);
      return NextResponse.json({
        success: true,
        postulations: [],
        stats,
        pagination: { page: 0, pageSize: 0, totalItems: stats.total, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
        timestamp: new Date().toISOString(),
        source: 'optimized-stats-only'
      });
    }

    // Paginación
    const totalPages = Math.ceil(filteredInscriptions.length / pageSize);
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedInscriptions = filteredInscriptions.slice(startIndex, endIndex);

    console.log(`📄 Processing ${paginatedInscriptions.length} inscriptions in parallel`);

    // Procesar en lotes para evitar sobrecarga
    const BATCH_SIZE = 10;
    const postulations: Postulation[] = [];

    for (let i = 0; i < paginatedInscriptions.length; i += BATCH_SIZE) {
      const batch = paginatedInscriptions.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(processInscriptionOptimized)
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          postulations.push(result.value);
        } else if (result.status === 'rejected') {
          console.error(`Failed to process inscription ${batch[index]?.id}:`, result.reason);
        }
      });

      // Pequeña pausa entre lotes para no sobrecargar
      if (i + BATCH_SIZE < paginatedInscriptions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Successfully processed ${postulations.length} postulations in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      postulations,
      stats,
      pagination: {
        page,
        pageSize,
        totalItems: filteredInscriptions.length,
        totalPages,
        hasNextPage: page < totalPages - 1,
        hasPreviousPage: page > 0
      },
      performance: {
        processingTimeMs: processingTime,
        cacheHits: cached ? 1 : 0
      },
      timestamp: new Date().toISOString(),
      source: 'optimized-with-cache-and-batching'
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Optimized Postulations management API error (${processingTime}ms):`, error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      performance: {
        processingTimeMs: processingTime
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
