import { v4 as uuidv4 } from 'uuid';
import { Job, JobUpdateData, JobFilter } from '../types';
import { saveJob, loadJob, loadJobs, deleteJob } from './storage';

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

// Update job status and properties
export async function updateJob(jobId: string, updates: JobUpdateData): Promise<Job | null> {
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

// Get job by ID
export async function getJob(jobId: string): Promise<Job | null> {
  return await loadJob(jobId);
}

// Get all jobs with optional filtering
export async function getJobs(filter?: JobFilter): Promise<Job[]> {
  return await loadJobs(filter);
}

// Cancel job
export async function cancelJob(jobId: string): Promise<boolean> {
  const job = await updateJob(jobId, { 
    status: 'cancelled', 
    message: 'Job cancelled by user' 
  });
  return job !== null;
}

// Clean up old completed jobs
export async function cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
  try {
    const jobs = await getJobs();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    let cleanedCount = 0;
    for (const job of jobs) {
      const jobDate = new Date(job.completedAt || job.createdAt);
      if (jobDate < cutoffDate && (job.status === 'completed' || job.status === 'failed')) {
        const deleted = await deleteJob(job.id);
        if (deleted) {
          cleanedCount++;
          console.log(`🗑️  Cleaned up old job: ${job.id}`);
        }
      }
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up old jobs:', error);
    return 0;
  }
}
