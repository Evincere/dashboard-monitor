// src/app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/services/database';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';

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
    const filters = DocumentFilterSchema.parse(Object.fromEntries(searchParams));
    
    // Create cache key based on filters
    const cacheKey = `documents-${JSON.stringify(filters)}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const connection = await getDatabaseConnection();

    try {
      // Build WHERE clause based on filters
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      if (filters.user) {
        whereConditions.push('(u.name LIKE ? OR u.email LIKE ?)');
        queryParams.push(`%${filters.user}%`, `%${filters.user}%`);
      }

      if (filters.type) {
        whereConditions.push('d.document_type = ?');
        queryParams.push(filters.type);
      }

      if (filters.status) {
        whereConditions.push('d.validation_status = ?');
        queryParams.push(filters.status);
      }

      if (filters.contest) {
        whereConditions.push('c.title LIKE ?');
        queryParams.push(`%${filters.contest}%`);
      }

      if (filters.dateFrom) {
        whereConditions.push('DATE(d.created_at) >= ?');
        queryParams.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        whereConditions.push('DATE(d.created_at) <= ?');
        queryParams.push(filters.dateTo);
      }

      if (filters.search) {
        whereConditions.push('(d.name LIKE ? OR d.original_name LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
        queryParams.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM documents d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN contests c ON d.contest_id = c.id
        ${whereClause}
      `;

      const [countResult] = await connection.execute(countQuery, queryParams) as [RowDataPacket[], any];
      const totalCount = countResult[0]?.total || 0;

      // Get paginated documents
      const offset = (filters.page - 1) * filters.limit;
      const documentsQuery = `
        SELECT 
          HEX(d.id) as id,
          d.name,
          d.original_name,
          d.file_path,
          d.file_size,
          d.mime_type,
          d.document_type,
          d.validation_status,
          d.created_at,
          d.updated_at,
          HEX(d.user_id) as user_id,
          u.name as user_name,
          u.email as user_email,
          HEX(d.contest_id) as contest_id,
          c.title as contest_title
        FROM documents d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN contests c ON d.contest_id = c.id
        ${whereClause}
        ORDER BY d.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [documentsResult] = await connection.execute(
        documentsQuery, 
        [...queryParams, filters.limit, offset]
      ) as [DocumentRow[], any];

      // Get summary statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_documents,
          COUNT(DISTINCT d.user_id) as unique_users,
          SUM(d.file_size) as total_size,
          AVG(d.file_size) as avg_size,
          COUNT(CASE WHEN d.validation_status = 'PENDING' THEN 1 END) as pending_count,
          COUNT(CASE WHEN d.validation_status = 'APPROVED' THEN 1 END) as approved_count,
          COUNT(CASE WHEN d.validation_status = 'REJECTED' THEN 1 END) as rejected_count
        FROM documents d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN contests c ON d.contest_id = c.id
        ${whereClause}
      `;

      const [statsResult] = await connection.execute(statsQuery, queryParams) as [RowDataPacket[], any];
      const stats = statsResult[0];

      // Get document types distribution
      const typesQuery = `
        SELECT 
          d.document_type,
          COUNT(*) as count
        FROM documents d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN contests c ON d.contest_id = c.id
        ${whereClause}
        GROUP BY d.document_type
        ORDER BY count DESC
      `;

      const [typesResult] = await connection.execute(typesQuery, queryParams) as [RowDataPacket[], any];

      const response = {
        documents: documentsResult.map(doc => ({
          id: doc.id,
          name: doc.name,
          originalName: doc.original_name,
          filePath: doc.file_path,
          fileSize: doc.file_size,
          mimeType: doc.mime_type,
          documentType: doc.document_type,
          validationStatus: doc.validation_status,
          createdAt: doc.created_at,
          updatedAt: doc.updated_at,
          user: {
            id: doc.user_id,
            name: doc.user_name,
            email: doc.user_email
          },
          contest: doc.contest_id ? {
            id: doc.contest_id,
            title: doc.contest_title
          } : null
        })),
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / filters.limit)
        },
        statistics: {
          totalDocuments: stats?.total_documents || 0,
          uniqueUsers: stats?.unique_users || 0,
          totalSize: stats?.total_size || 0,
          avgSize: stats?.avg_size || 0,
          statusCounts: {
            pending: stats?.pending_count || 0,
            approved: stats?.approved_count || 0,
            rejected: stats?.rejected_count || 0
          }
        },
        documentTypes: typesResult.map(type => ({
          type: type.document_type,
          count: type.count
        }))
      };

      // Cache the results
      setCachedData(cacheKey, response);

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
        SET validation_status = ?, updated_at = NOW()
        WHERE id = UNHEX(?)
      `;

      const [result] = await connection.execute(updateQuery, [
        updateData.validation_status,
        documentId
      ]);

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
        SELECT file_path, name 
        FROM documents 
        WHERE id = UNHEX(?)
      `;

      const [docResult] = await connection.execute(getDocQuery, [documentId]) as [RowDataPacket[], any];
      
      if (docResult.length === 0) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Delete document from database
      const deleteQuery = `
        DELETE FROM documents 
        WHERE id = UNHEX(?)
      `;

      await connection.execute(deleteQuery, [documentId]);

      // Clear cache
      cache.clear();

      // Note: File system cleanup would be handled here in a real implementation
      // For now, we just log the file path that should be deleted
      console.log(`Document deleted from DB. File to cleanup: ${docResult[0].file_path}`);

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