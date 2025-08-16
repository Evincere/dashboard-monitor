import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root1234',
  database: process.env.DB_DATABASE || 'mpd_concursos',
  timezone: '+00:00'
};

interface InscriptionStats {
  totalUsers: number;
  totalInscriptions: number;
  inscriptionRate: number; // Porcentaje de usuarios que se inscribieron
  statusBreakdown: {
    status: string;
    count: number;
    percentage: number;
    label: string;
    description: string;
  }[];
  readyForReview: number; // COMPLETED_WITH_DOCS
  pendingDocuments: number; // COMPLETED_PENDING_DOCS + ACTIVE
  timeline: {
    month: string;
    inscriptions: number;
    cumulative: number;
  }[];
  contestInfo?: {
    title: string;
    inscriptionPeriod: {
      start: string | null;
      end: string | null;
    };
    documentationPeriod: {
      start: string | null;
      end: string | null;
    };
    status: string;
  };
}

// Mapeo de estados a etiquetas en español
const statusLabels: { [key: string]: { label: string; description: string } } = {
  'COMPLETED_WITH_DOCS': {
    label: 'Completas para Revisión',
    description: 'Inscripciones con documentación completa lista para evaluación'
  },
  'ACTIVE': {
    label: 'En Proceso',
    description: 'Inscripciones activas en proceso de completar documentación'
  },
  'COMPLETED_PENDING_DOCS': {
    label: 'Documentación Pendiente',
    description: 'Inscripciones completadas pero con documentos faltantes'
  },
  'APPROVED': {
    label: 'Aprobadas',
    description: 'Inscripciones aprobadas por la administración'
  },
  'REJECTED': {
    label: 'Rechazadas',
    description: 'Inscripciones rechazadas'
  },
  'CANCELLED': {
    label: 'Canceladas',
    description: 'Inscripciones canceladas por el usuario'
  },
  'FROZEN': {
    label: 'Congeladas',
    description: 'Inscripciones temporalmente suspendidas'
  },
  'PENDING': {
    label: 'Pendientes',
    description: 'Inscripciones en espera de revisión inicial'
  }
};

async function getInscriptionStats(contestId: number | null = null): Promise<InscriptionStats> {
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(dbConfig);

    // Construir filtros para el concurso específico
    const contestFilter = contestId ? `AND contest_id = ${contestId}` : '';
    const contestWhereFilter = contestId ? `WHERE contest_id = ${contestId}` : '';
    const contestAndFilter = contestId ? `WHERE contest_id = ${contestId} AND` : 'WHERE';

    // 1. Total de usuarios registrados (siempre total, independiente del concurso)
    const [usersResult] = await connection.execute(`
      SELECT COUNT(*) as count FROM user_entity
    `);
    const totalUsers = (usersResult as any[])[0]?.count || 0;

    // 2. Total de inscripciones (filtrado por concurso si se especifica)
    const [inscriptionsResult] = await connection.execute(`
      SELECT COUNT(*) as count FROM inscriptions ${contestWhereFilter}
    `);
    const totalInscriptions = (inscriptionsResult as any[])[0]?.count || 0;

    // 3. Tasa de inscripción
    const inscriptionRate = totalUsers > 0 ? Number(((totalInscriptions / totalUsers) * 100).toFixed(1)) : 0;

    // 4. Desglose por estado (filtrado por concurso si se especifica)
    const [statusResult] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM inscriptions
      ${contestWhereFilter ? `${contestWhereFilter} AND` : 'WHERE'} status IS NOT NULL
      GROUP BY status
      ORDER BY count DESC
    `);

    const statusData = statusResult as any[];
    const statusBreakdown = statusData.map(item => ({
      status: item.status,
      count: item.count,
      percentage: totalInscriptions > 0 ? Number(((item.count / totalInscriptions) * 100).toFixed(1)) : 0,
      label: statusLabels[item.status]?.label || item.status,
      description: statusLabels[item.status]?.description || 'Estado de inscripción'
    }));

    // 5. Métricas específicas para gestión
    const readyForReview = statusData.find(s => s.status === 'COMPLETED_WITH_DOCS')?.count || 0;
    const pendingDocs = statusData.find(s => s.status === 'COMPLETED_PENDING_DOCS')?.count || 0;
    const active = statusData.find(s => s.status === 'ACTIVE')?.count || 0;
    const pendingDocuments = pendingDocs + active;

    // 6. Obtener información del concurso si se especifica
    let contestInfo = undefined;
    if (contestId) {
      const [contestResult] = await connection.execute(`
        SELECT 
          title,
          status,
          start_date,
          end_date,
          inscription_start_date,
          inscription_end_date
        FROM contests
        WHERE id = ?
      `, [contestId]);
      
      const contest = (contestResult as any[])[0];
      if (contest) {
        // Usar inscription dates si están disponibles, sino usar start/end dates
        let inscriptionStart = contest.inscription_start_date || contest.start_date;
        let inscriptionEnd = contest.inscription_end_date || contest.end_date;
        
        // Para el concurso MULTIFUERO, usar las fechas conocidas si no están en BD
        if (contest.title === 'MULTIFUERO' && !contest.inscription_start_date) {
          // Fechas conocidas del concurso MULTIFUERO basadas en la documentación
          inscriptionStart = '2025-07-30T00:00:00.000Z';
          inscriptionEnd = '2025-08-08T23:59:59.000Z';
        }
        
        // Calcular período de documentación (3 días hábiles después del fin de inscripción)
        let docPeriodStart = null;
        let docPeriodEnd = null;
        
        if (inscriptionEnd) {
          const endDate = new Date(inscriptionEnd);
          // Agregar 1 día para el inicio del período de documentación
          docPeriodStart = new Date(endDate);
          docPeriodStart.setDate(docPeriodStart.getDate() + 1);
          
          // Para MULTIFUERO, usar fechas específicas conocidas
          if (contest.title === 'MULTIFUERO') {
            docPeriodStart = new Date('2025-08-09T00:00:00.000Z');
            docPeriodEnd = new Date('2025-08-13T23:59:59.000Z');
          } else {
            // Agregar 3 días hábiles (asumiendo L-V, excluye fines de semana)
            docPeriodEnd = new Date(docPeriodStart);
            let daysAdded = 0;
            while (daysAdded < 3) {
              docPeriodEnd.setDate(docPeriodEnd.getDate() + 1);
              const dayOfWeek = docPeriodEnd.getDay();
              if (dayOfWeek !== 0 && dayOfWeek !== 6) { // No es domingo (0) ni sábado (6)
                daysAdded++;
              }
            }
          }
        }
        
        contestInfo = {
          title: contest.title,
          inscriptionPeriod: {
            start: inscriptionStart,
            end: inscriptionEnd
          },
          documentationPeriod: {
            start: docPeriodStart?.toISOString() || null,
            end: docPeriodEnd?.toISOString() || null
          },
          status: contest.status
        };
      }
    }

    // 7. Timeline de inscripciones (con fechas dinámicas si hay concurso seleccionado)
    let timelineQuery = '';
    let timelineParams: any[] = [];
    
    if (contestInfo && contestInfo.inscriptionPeriod.start) {
      // Si hay un concurso específico, usar su período de inscripción como base
      timelineQuery = `
        SELECT 
          DATE_FORMAT(inscription_date, '%Y-%m-%d') as date,
          COUNT(*) as inscriptions
        FROM inscriptions
        WHERE contest_id = ? 
          AND inscription_date >= ?
          AND inscription_date IS NOT NULL
        GROUP BY DATE_FORMAT(inscription_date, '%Y-%m-%d')
        ORDER BY date ASC
      `;
      timelineParams = [contestId, contestInfo.inscriptionPeriod.start];
    } else {
      // Fallback a últimos 6 meses
      timelineQuery = `
        SELECT 
          DATE_FORMAT(inscription_date, '%Y-%m') as month,
          COUNT(*) as inscriptions
        FROM inscriptions
        ${contestAndFilter} inscription_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          AND inscription_date IS NOT NULL ${contestFilter}
        GROUP BY DATE_FORMAT(inscription_date, '%Y-%m')
        ORDER BY month ASC
      `;
    }

    const [timelineResult] = await connection.execute(timelineQuery, timelineParams);
    const timelineData = timelineResult as any[];
    
    let cumulative = 0;
    const timeline = timelineData.map(item => {
      cumulative += item.inscriptions;
      const dateKey = item.date || item.month;
      let displayName = '';
      
      if (item.date) {
        // Formato diario para concurso específico
        displayName = new Date(item.date).toLocaleDateString('es-ES', { 
          month: 'short', 
          day: 'numeric'
        });
      } else {
        // Formato mensual para vista general
        displayName = new Date(item.month + '-01').toLocaleDateString('es-ES', { 
          month: 'short', 
          year: '2-digit' 
        });
      }
      
      return {
        month: displayName,
        inscriptions: item.inscriptions,
        cumulative
      };
    });

    return {
      totalUsers,
      totalInscriptions,
      inscriptionRate,
      statusBreakdown,
      readyForReview,
      pendingDocuments,
      timeline,
      contestInfo
    };

  } catch (error) {
    console.error('Error fetching inscription stats:', error);
    
    // Return fallback data
    return {
      totalUsers: 0,
      totalInscriptions: 0,
      inscriptionRate: 0,
      statusBreakdown: [],
      readyForReview: 0,
      pendingDocuments: 0,
      timeline: []
    };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contestId = searchParams.get('contestId');
    const stats = await getInscriptionStats(contestId ? parseInt(contestId) : null);

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Inscription stats API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch inscription statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
