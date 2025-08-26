import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs/queue/manager';
import { promises as fs } from 'fs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const job = await getJob((await context.params).id);

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Job is not completed yet' },
        { status: 400 }
      );
    }

    if (!job.result?.filePath) {
      return NextResponse.json(
        { success: false, error: 'No file available for download' },
        { status: 400 }
      );
    }

    // Check if file exists
    try {
      await fs.access(job.result.filePath);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'File not found on disk' },
        { status: 404 }
      );
    }

    // Read the file
    const fileContent = await fs.readFile(job.result.filePath);
    
    if (fileContent.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File is empty' },
        { status: 400 }
      );
    }
    
    // Create response with appropriate headers
    const response = new NextResponse(new Uint8Array(fileContent));
    
    response.headers.set('Content-Type', job.result.contentType || 'application/octet-stream');
    response.headers.set('Content-Disposition', `attachment; filename="${job.result.fileName}"`);
    response.headers.set('Content-Length', fileContent.length.toString());
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    // Log download activity
    console.log(`📥 Job download: ${(await context.params).id} - ${job.result.fileName} (${fileContent.length} bytes)`);

    return response;

  } catch (error) {
    console.error('Error serving job download:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to serve download' },
      { status: 500 }
    );
  }
}
