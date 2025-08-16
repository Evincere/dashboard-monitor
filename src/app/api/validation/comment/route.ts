// src/app/api/validation/comment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * @fileOverview API para agregar comentarios y observaciones a postulaciones
 * Permite agregar notas administrativas sin cambiar el estado de validación
 */

interface CommentRequest {
  userId?: string;
  dni?: string;
  documentId?: string;
  comment: string;
  commentType: 'OBSERVATION' | 'NOTE' | 'ALERT' | 'REMINDER';
  isPublic?: boolean;
  validatedBy: string;
}

interface CommentResponse {
  id: string;
  userId: string;
  documentId?: string;
  comment: string;
  commentType: string;
  isPublic: boolean;
  validatedBy: string;
  createdAt: string;
}

// Simulamos un almacén de comentarios (en producción esto iría a la BD)
let commentsStore: CommentResponse[] = [];

export async function POST(request: NextRequest) {
  try {
    const body: CommentRequest = await request.json();
    
    const { userId, dni, documentId, comment, commentType, isPublic = false, validatedBy } = body;

    // Validar que tengamos el identificador del usuario
    if (!userId && !dni) {
      return NextResponse.json({
        success: false,
        error: 'User ID or DNI is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Validar campos requeridos
    if (!comment || !commentType || !validatedBy) {
      return NextResponse.json({
        success: false,
        error: 'Comment, comment type, and validated by fields are required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log('💬 Processing comment request:', { userId, dni, documentId, commentType, validatedBy });

    let targetUserId = userId;

    // Si tenemos DNI pero no userId, buscar el usuario
    if (!targetUserId && dni) {
      const postulantResponse = await backendClient.getPostulantByDni(dni);
      
      if (!postulantResponse.success || !postulantResponse.data?.user) {
        return NextResponse.json({
          success: false,
          error: 'Postulant not found with provided DNI',
          timestamp: new Date().toISOString()
        }, { status: 404 });
      }
      
      targetUserId = postulantResponse.data.user.id;
    }

    // Si se especifica un documento, verificar que existe
    if (documentId) {
      const documentsResponse = await backendClient.getDocuments({ 
        usuarioId: targetUserId,
        size: 100
      });
      
      if (!documentsResponse.success) {
        console.error('Error fetching user documents:', documentsResponse.error);
        return NextResponse.json({
          success: false,
          error: documentsResponse.error,
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }

      const userDocuments = documentsResponse.data?.content || [];
      const documentExists = userDocuments.some(doc => doc.id === documentId);
      
      if (!documentExists) {
        return NextResponse.json({
          success: false,
          error: 'Specified document not found for this user',
          timestamp: new Date().toISOString()
        }, { status: 404 });
      }
    }

    // Crear el comentario
    const newComment: CommentResponse = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: targetUserId,
      documentId,
      comment,
      commentType,
      isPublic,
      validatedBy,
      createdAt: new Date().toISOString()
    };

    // Agregar al almacén (en producción esto iría a la BD)
    commentsStore.push(newComment);

    console.log(`💬 Comment added successfully: ${newComment.id}`);

    // Obtener estado actualizado del postulante
    const updatedPostulantResponse = await backendClient.getPostulantByDni(dni || targetUserId);
    const updatedPostulant = updatedPostulantResponse.data;

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully',
      data: {
        comment: newComment,
        updatedPostulant: updatedPostulant || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Comment API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to add comment',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const dni = searchParams.get('dni');
    const documentId = searchParams.get('documentId');
    const includePrivate = searchParams.get('includePrivate') === 'true';

    let targetUserId = userId;

    // Si tenemos DNI pero no userId, buscar el usuario
    if (!targetUserId && dni) {
      const postulantResponse = await backendClient.getPostulantByDni(dni);
      
      if (!postulantResponse.success || !postulantResponse.data?.user) {
        return NextResponse.json({
          success: false,
          error: 'Postulant not found with provided DNI',
          timestamp: new Date().toISOString()
        }, { status: 404 });
      }
      
      targetUserId = postulantResponse.data.user.id;
    }

    if (!targetUserId) {
      return NextResponse.json({
        success: false,
        error: 'User ID or DNI is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log(`💬 Fetching comments for user: ${targetUserId}`);

    // Filtrar comentarios
    let filteredComments = commentsStore.filter(comment => comment.userId === targetUserId);

    if (documentId) {
      filteredComments = filteredComments.filter(comment => comment.documentId === documentId);
    }

    if (!includePrivate) {
      filteredComments = filteredComments.filter(comment => comment.isPublic);
    }

    // Ordenar por fecha (más recientes primero)
    filteredComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: {
        comments: filteredComments,
        total: filteredComments.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get comments API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch comments',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
