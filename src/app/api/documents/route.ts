// src/app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/services/database';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// Validation schemas
const DocumentFilterSchema = z.object({
  user: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  contest: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const DocumentUpdateSchema = z.object({
  validation_status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

interface DocumentRow extends RowDataPacket {
  id: string;
  name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: string;
  validation_status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_name: string;
  user_email: string;
  contest_id?: string;
  contest_title?: string;
}

// Simple in-memory cache
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

// Configuration for file storage based on MPD system architecture
const STORAGE_BASE_PATH = process.env.STORAGE_BASE_DIR || '/app/storage';
const DOCUMENTS_DIR = process.env.DOCUMENTS_DIR || 'documents';
const LOCAL_DOCS_PATH = process.env.LOCAL_DOCUMENTS_PATH || 'B:\\concursos_situacion_post_gracia\\descarga_administracion_20250814_191745\\documentos';

/**
 * Get file size from filesystem
 * @param filePath - Relative path from database (format: "dni/filename")
 * @returns File size in bytes or 0 if file doesn't exist
 */
async function getFileSize(filePath: string): Promise<number> {
  if (!filePath) return 0;
  
  try {
    // Try multiple possible paths based on MPD storage structure
    const possiblePaths = [
      // Local development path with real documents (highest priority)
      path.join(LOCAL_DOCS_PATH, filePath),
      // Primary production path (Docker volume mount)
      path.join(STORAGE_BASE_PATH, DOCUMENTS_DIR, filePath),
      // Development/local paths
      path.join(process.cwd(), 'storage', 'documents', filePath),
      path.join(process.cwd(), 'uploads', filePath),
      // Legacy paths for compatibility
      path.join('/app/storage/documents', filePath),
      path.join('C:', 'app', 'storage', 'documents', filePath),
      // Direct path if already absolute
      filePath
    ];
    
    for (const fullPath of possiblePaths) {
      try {
        const stats = await fs.promises.stat(fullPath);
        if (stats.isFile()) {
          return stats.size;
        }
      } catch (err) {
        // Continue to next path
        continue;
      }
    }
    
    // If no file found, return 0
    return 0;
  } catch (error) {
    console.warn(`Could not get file size for ${filePath}:`, error);
    return 0;
  }
}

/**
 * Get file sizes for multiple documents concurrently
 * @param documents - Array of document objects with filePath
 * @returns Array of documents with calculated file sizes
 */
async function calculateFileSizes(documents: any[]): Promise<any[]> {
  const sizePromises = documents.map(async (doc) => {
    const fileSize = await getFileSize(doc.filePath);
    return {
      ...doc,
      fileSize
    };
  });
  
  return Promise.all(sizePromises);
}

function getCachedData(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    
    const connection = await getDatabaseConnection();

    try {
      // Get total count
      const countQuery = 'SELECT COUNT(*) as total FROM documents';
      const [countResult] = await connection.query(countQuery) as [RowDataPacket[], any];
      const totalCount = countResult[0]?.total || 0;

      // Get paginated documents
      const offset = (page - 1) * limit;
      const documentsQuery = `
        SELECT 
          HEX(d.id) as id,
          d.file_name as name,
          d.file_name as original_name,
          d.file_path,
          d.content_type as mime_type,
          COALESCE(dt.name, 'Sin especificar') as document_type,
          d.status as validation_status,
          d.upload_date as created_at,
          d.upload_date as updated_at,
          HEX(d.user_id) as user_id,
          COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Unknown User') as user_name,
          COALESCE(u.email, 'unknown@email.com') as user_email
        FROM documents d
        LEFT JOIN user_entity u ON d.user_id = u.id
        LEFT JOIN document_types dt ON d.document_type_id = dt.id
        ORDER BY d.upload_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [documentsResult] = await connection.query(documentsQuery) as [DocumentRow[], any];

      // Get statistics (without file_size since it doesn't exist in this table)
      const statsQuery = `
        SELECT 
          COUNT(*) as total_documents,
          COUNT(DISTINCT user_id) as unique_users,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved_count,
          SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_count
        FROM documents
      `;
      
      const [statsResult] = await connection.query(statsQuery) as [RowDataPacket[], any];
      const stats = statsResult[0] || {};
      
      // Get document types
      const typesQuery = `
        SELECT 
          COALESCE(dt.name, 'Sin especificar') as type,
          COUNT(*) as count
        FROM documents d
        LEFT JOIN document_types dt ON d.document_type_id = dt.id
        GROUP BY dt.name
        ORDER BY count DESC
      `;
      
      const [typesResult] = await connection.query(typesQuery) as [RowDataPacket[], any];

      // Calculate file sizes from filesystem
      const documentsWithoutSizes = documentsResult.map(doc => ({
        id: doc.id,
        name: doc.name,
        originalName: doc.original_name,
        filePath: doc.file_path || '',
        fileSize: 0, // Will be calculated
        mimeType: doc.mime_type || 'application/octet-stream',
        documentType: doc.document_type || 'Sin especificar',
        validationStatus: doc.validation_status || 'PENDING',
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        user: {
          id: doc.user_id,
          name: doc.user_name ? doc.user_name.trim() : 'Unknown User',
          email: doc.user_email || 'unknown@email.com'
        },
        contest: null
      }));
      
      // Calculate file sizes concurrently
      const documentsWithSizes = await calculateFileSizes(documentsWithoutSizes);
      
      // Calculate total and average sizes
      const totalSize = documentsWithSizes.reduce((sum, doc) => sum + doc.fileSize, 0);
      const avgSize = documentsWithSizes.length > 0 ? Math.round(totalSize / documentsWithSizes.length) : 0;

      const response = {
        documents: documentsWithSizes,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        statistics: {
          totalDocuments: parseInt(stats.total_documents) || 0,
          uniqueUsers: parseInt(stats.unique_users) || 0,
          totalSize: totalSize, // Calculated from filesystem
          avgSize: avgSize, // Calculated from filesystem
          statusCounts: {
            pending: parseInt(stats.pending_count) || 0,
            approved: parseInt(stats.approved_count) || 0,
            rejected: parseInt(stats.rejected_count) || 0
          }
        },
        documentTypes: typesResult.map(type => ({
          type: type.type,
          count: parseInt(type.count)
        }))
      };

      return NextResponse.json({
        ...response,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch documents',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updateData = DocumentUpdateSchema.parse(body);

    const connection = await getDatabaseConnection();

    try {
      // Update document
      const updateQuery = `
        UPDATE documents 
        SET status = '${updateData.validation_status}'
        WHERE id = UNHEX('${documentId}')
      `;

      const [result] = await connection.query(updateQuery);

      // Clear cache
      cache.clear();

      return NextResponse.json({
        success: true,
        message: 'Document updated successfully',
        timestamp: new Date().toISOString()
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      {
        error: 'Failed to update document',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const connection = await getDatabaseConnection();

    try {
      // Get document info before deletion for file cleanup
      const getDocQuery = `
        SELECT file_path, file_name 
        FROM documents 
        WHERE id = UNHEX('${documentId}')
      `;

      const [docResult] = await connection.query(getDocQuery) as [RowDataPacket[], any];
      
      if (docResult.length === 0) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Delete document from database
      const deleteQuery = `
        DELETE FROM documents 
        WHERE id = UNHEX('${documentId}')
      `;

      await connection.query(deleteQuery);

      // Clear cache
      cache.clear();

      // Note: File system cleanup would be handled here in a real implementation
      // For now, we just log the file path that should be deleted
      console.log(`Document deleted from DB. File to cleanup: ${docResult[0].file_path}`);
      console.log(`Deleted document: ${docResult[0].file_name}`);

      return NextResponse.json({
        success: true,
        message: 'Document deleted successfully',
        timestamp: new Date().toISOString()
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete document',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}