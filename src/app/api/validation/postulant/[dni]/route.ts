// src/app/api/validation/postulant/[dni]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * @fileOverview API para obtener expediente completo de un postulante por DNI
 * Combina datos de usuario, inscripción, documentos y historial de validación
 */

interface PostulantExpediente {
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    dni: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  inscription: {
    id: string;
    status: string;
    currentStep: string;
    centroDeVida: string;
    documentosCompletos: boolean;
    acceptedTerms: boolean;
    createdAt: string;
    updatedAt: string;
  };
  documents: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    processing: number;
    error: number;
    list: Array<{
      id: string;
      fileName: string;
      filePath: string;
      contentType: string;
      fileSize: number;
      status: string;
      uploadDate: string;
      validatedAt?: string;
      validatedBy?: string;
      rejectionReason?: string;
      comments?: string;
      documentTypeId: string;
    }>;
  };
  validationHistory: Array<{
    date: string;
    action: 'APPROVED' | 'REJECTED' | 'PENDING_REVIEW';
    validatedBy: string;
    comments?: string;
    documentId?: string;
  }>;
  currentValidationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIAL';
  recommendations: string[];
  circunscripcion: {
    code: string;
    name: string;
    region: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { dni: string } }
) {
  try {
    const dni = params.dni;
    
    if (!dni) {
      return NextResponse.json({
        success: false,
        error: 'DNI is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log(`🎯 Fetching complete expediente for DNI: ${dni}`);

    // Usar la función del cliente que ya combina los datos
    const postulantResponse = await backendClient.getPostulantByDni(dni);
    
    if (!postulantResponse.success) {
      console.error('Error fetching postulant:', postulantResponse.error);
      return NextResponse.json({
        success: false,
        error: postulantResponse.error,
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    const { user, inscription, documents } = postulantResponse.data;

    if (!user || !inscription) {
      return NextResponse.json({
        success: false,
        error: 'Incomplete postulant data found',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Calcular estadísticas de documentos
    const documentStats = {
      total: documents.length,
      pending: documents.filter(d => d.status === 'PENDING').length,
      approved: documents.filter(d => d.status === 'APPROVED').length,
      rejected: documents.filter(d => d.status === 'REJECTED').length,
      processing: documents.filter(d => d.status === 'PROCESSING').length,
      error: documents.filter(d => d.status === 'ERROR').length,
      list: documents
    };

    // Determinar estado actual de validación
    let currentValidationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIAL' = 'PENDING';
    
    if (documentStats.total === 0) {
      currentValidationStatus = 'PENDING';
    } else if (documentStats.approved === documentStats.total) {
      currentValidationStatus = 'APPROVED';
    } else if (documentStats.rejected > 0) {
      if (documentStats.approved > 0) {
        currentValidationStatus = 'PARTIAL';
      } else {
        currentValidationStatus = 'REJECTED';
      }
    } else if (documentStats.approved > 0) {
      currentValidationStatus = 'PARTIAL';
    }

    // Crear historial de validación desde los documentos
    const validationHistory = documents
      .filter(doc => doc.validatedAt)
      .map(doc => ({
        date: doc.validatedAt!,
        action: doc.status as 'APPROVED' | 'REJECTED',
        validatedBy: doc.validatedBy || 'Sistema',
        comments: doc.comments,
        documentId: doc.id
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Generar recomendaciones basadas en el estado
    const recommendations = [];
    if (documentStats.pending > 0) {
      recommendations.push(`Hay ${documentStats.pending} documento(s) pendiente(s) de revisión`);
    }
    if (documentStats.rejected > 0) {
      recommendations.push(`Hay ${documentStats.rejected} documento(s) rechazado(s) que requieren atención`);
    }
    if (documentStats.error > 0) {
      recommendations.push(`Hay ${documentStats.error} documento(s) con errores de procesamiento`);
    }
    if (documentStats.total === 0) {
      recommendations.push('El postulante no ha subido documentos');
    }

    // Mapear circunscripción (simplificado por ahora)
    const circunscripcion = {
      code: inscription.centroDeVida || 'UNKNOWN',
      name: inscription.centroDeVida || 'UNKNOWN',
      region: inscription.centroDeVida?.includes('CAPITAL') ? 'Capital' : 'Interior'
    };

    const expediente: PostulantExpediente = {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        dni: user.username, // Asumiendo que username es el DNI
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      inscription: {
        id: inscription.id,
        status: inscription.status,
        currentStep: inscription.currentStep,
        centroDeVida: inscription.centroDeVida,
        documentosCompletos: inscription.documentosCompletos,
        acceptedTerms: inscription.acceptedTerms,
        createdAt: inscription.createdAt,
        updatedAt: inscription.updatedAt
      },
      documents: documentStats,
      validationHistory,
      currentValidationStatus,
      recommendations,
      circunscripcion
    };

    console.log(`✅ Expediente completo obtenido para DNI ${dni}:`, {
      documentos: documentStats.total,
      estado: currentValidationStatus,
      recomendaciones: recommendations.length
    });

    return NextResponse.json({
      success: true,
      data: expediente,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Postulant expediente API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch postulant expediente',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
