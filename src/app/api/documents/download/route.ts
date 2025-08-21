// src/app/api/documents/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/services/database';
import type { RowDataPacket } from 'mysql2';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
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
      // Get document information
      const query = `
        SELECT 
          d.name,
          d.original_name,
          d.file_path,
          d.file_size,
          d.mime_type,
          u.name as user_name
        FROM documents d
        JOIN users u ON d.user_id = u.id
        WHERE d.id = UNHEX(?)
      `;

      const [result] = await connection.execute(query, [documentId]) as [RowDataPacket[], any];

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      const document = result[0];

      // In a real implementation, you would read the file from the storage volume
      // For now, we'll return the document metadata and indicate where the file should be
      const documentStoragePath = process.env.DOCUMENT_STORAGE_PATH || '/var/lib/docker/volumes/mpd_concursos_document_storage_prod/_data';
      const fullFilePath = join(documentStoragePath, document.file_path);

      try {
        // Attempt to read the file (this would work if the volume is mounted)
        const fileBuffer = await readFile(fullFilePath);

        // Set appropriate headers for file download
        const headers = new Headers();
        headers.set('Content-Type', document.mime_type || 'application/octet-stream');
        headers.set('Content-Disposition', `attachment; filename="${document.original_name}"`);
        headers.set('Content-Length', document.file_size.toString());
        headers.set('X-Document-User', document.user_name);

        // Convert Buffer to Uint8Array for NextResponse
        const uint8Array = new Uint8Array(fileBuffer);

        return new NextResponse(uint8Array, {
          status: 200,
          headers
        });

      } catch (fileError) {
        // If file cannot be read, return metadata with download instructions
        console.error('File read error:', fileError);

        return NextResponse.json({
          error: 'File not accessible',
          message: 'Document exists in database but file cannot be accessed',
          document: {
            id: documentId,
            name: document.name,
            originalName: document.original_name,
            filePath: document.file_path,
            fullPath: fullFilePath,
            fileSize: document.file_size,
            mimeType: document.mime_type,
            userName: document.user_name
          },
          instructions: 'To enable file downloads, ensure the document storage volume is properly mounted',
          timestamp: new Date().toISOString()
        }, { status: 503 });
      }

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json(
      {
        error: 'Failed to download document',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}