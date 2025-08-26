import { NextRequest, NextResponse } from 'next/server';
import { createJob, getJobs, getJob } from '@/lib/jobs/queue/manager';

// GET /api/jobs - List jobs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const limit = searchParams.get('limit');

    const jobs = await getJobs({
      status,
      limit: limit ? parseInt(limit) : undefined
    });

    return NextResponse.json({
      success: true,
      data: jobs,
      total: jobs.length
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// POST /api/jobs - Create new job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { success: false, error: 'Type and data are required' },
        { status: 400 }
      );
    }

    const job = await createJob(type, data);

    // Start processing asynchronously
    processJobAsync(job.id);

    return NextResponse.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create job' },
      { status: 500 }
    );
  }
}

// Async job processing
async function processJobAsync(jobId: string) {
  try {
    const job = await getJob(jobId);
    if (!job) return;

    const { processBackupDownloadJob } = await import('@/lib/jobs/workers/backup-download-worker');
    await processBackupDownloadJob(job);
  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);
  }
}
