import { promises as fs } from 'fs';
import path from 'path';
import { Job, JobFilter } from '../types';

const JOBS_DIR = process.env.NODE_ENV === 'production' 
  ? '/var/lib/docker/volumes/mpd_concursos_backup_data_prod/_data/jobs'
  : path.resolve('./temp/jobs');

// Ensure jobs directory exists
export async function ensureJobsDir(): Promise<void> {
  try {
    await fs.mkdir(JOBS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating jobs directory:', error);
  }
}

// Save job to file
export async function saveJob(job: Job): Promise<void> {
  await ensureJobsDir();
  const jobFile = path.join(JOBS_DIR, `${job.id}.json`);
  await fs.writeFile(jobFile, JSON.stringify(job, null, 2));
}

// Load job from file
export async function loadJob(jobId: string): Promise<Job | null> {
  try {
    const jobFile = path.join(JOBS_DIR, `${jobId}.json`);
    const content = await fs.readFile(jobFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

// Load all jobs with optional filtering
export async function loadJobs(filter?: JobFilter): Promise<Job[]> {
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
    console.error('Error loading jobs:', error);
    return [];
  }
}

// Delete job file
export async function deleteJob(jobId: string): Promise<boolean> {
  try {
    const jobFile = path.join(JOBS_DIR, `${jobId}.json`);
    await fs.unlink(jobFile);
    return true;
  } catch (error) {
    console.warn(`Error deleting job file ${jobId}:`, error);
    return false;
  }
}
