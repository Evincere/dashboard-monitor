import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  type: 'backup_download';
  status: JobStatus;
  progress: number;
  message: string;
  data: any;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: any;
}

export interface BackupDownloadJobData {
  backupId: string;
  backupName: string;
  downloadType: 'auto' | 'database' | 'documents' | 'combined';
  requestedBy?: string;
}

const JOBS_DIR = process.env.NODE_ENV === 'production' 
  ? '/var/lib/docker/volumes/mpd_concursos_backup_data_prod/_data/jobs'
  : path.resolve('./temp/jobs');

// Ensure jobs directory exists
async function ensureJobsDir(): Promise<void> {
  try {
    await fs.mkdir(JOBS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating jobs directory:', error);
  }
}

// Save job to file
async function saveJob(job: Job): Promise<void> {
  await ensureJobsDir();
  const jobFile = path.join(JOBS_DIR, `${job.id}.json`);
  await fs.writeFile(jobFile, JSON.stringify(job, null, 2));
}

// Load job from file
async function loadJob(jobId: string): Promise<Job | null> {
  try {
    const jobFile = path.join(JOBS_DIR, `${jobId}.json`);
    const content = await fs.readFile(jobFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

// Create new job
export async function createJob(type: Job['type'], data: any): Promise<Job> {
  const job: Job = {
    id: uuidv4(),
    type,
    status: 'queued',
    progress: 0,
    message: 'Job queued',
    data,
    createdAt: new Date().toISOString(),
  };

  await saveJob(job);
  console.log(`📋 Job created: ${job.id} (${type})`);
  return job;
}

// Update job status
export async function updateJob(
  jobId: string, 
  updates: Partial<Pick<Job, 'status' | 'progress' | 'message' | 'error' | 'result'>>
): Promise<Job | null> {
  const job = await loadJob(jobId);
  if (!job) return null;

  // Update fields
  Object.assign(job, updates);

  // Set timestamps based on status
  if (updates.status === 'running' && !job.startedAt) {
    job.startedAt = new Date().toISOString();
  }
  if (updates.status === 'completed' || updates.status === 'failed' || updates.status === 'cancelled') {
    job.completedAt = new Date().toISOString();
  }

  await saveJob(job);
  console.log(`📋 Job updated: ${job.id} - ${job.status} (${job.progress}%) - ${job.message}`);
  return job;
}

// Get job status
export async function getJob(jobId: string): Promise<Job | null> {
  return await loadJob(jobId);
}

// Get all jobs (with optional filtering)
export async function getJobs(filter?: { status?: JobStatus; type?: Job['type']; limit?: number }): Promise<Job[]> {
  try {
    await ensureJobsDir();
    const files = await fs.readdir(JOBS_DIR);
    const jobFiles = files.filter(f => f.endsWith('.json'));
    
    const jobs: Job[] = [];
    for (const file of jobFiles) {
      try {
        const content = await fs.readFile(path.join(JOBS_DIR, file), 'utf-8');
        const job = JSON.parse(content);
        
        // Apply filters
        if (filter?.status && job.status !== filter.status) continue;
        if (filter?.type && job.type !== filter.type) continue;
        
        jobs.push(job);
      } catch (error) {
        console.warn(`Error reading job file ${file}:`, error);
      }
    }
    
    // Sort by creation date (newest first)
    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Apply limit
    if (filter?.limit) {
      return jobs.slice(0, filter.limit);
    }
    
    return jobs;
  } catch (error) {
    console.error('Error getting jobs:', error);
    return [];
  }
}

// Cancel job
export async function cancelJob(jobId: string): Promise<boolean> {
  const job = await updateJob(jobId, { 
    status: 'cancelled', 
    message: 'Job cancelled by user' 
  });
  return job !== null;
}

// Clean up old completed jobs (older than X days)
export async function cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
  try {
    const jobs = await getJobs();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    let cleanedCount = 0;
    for (const job of jobs) {
      const jobDate = new Date(job.completedAt || job.createdAt);
      if (jobDate < cutoffDate && (job.status === 'completed' || job.status === 'failed')) {
        try {
          const jobFile = path.join(JOBS_DIR, `${job.id}.json`);
          await fs.unlink(jobFile);
          cleanedCount++;
          console.log(`🗑️  Cleaned up old job: ${job.id}`);
        } catch (error) {
          console.warn(`Error deleting job file ${job.id}:`, error);
        }
      }
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up old jobs:', error);
    return 0;
  }
}
