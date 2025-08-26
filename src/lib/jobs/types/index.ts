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

export interface JobFilter {
  status?: JobStatus;
  type?: Job['type'];
  limit?: number;
}

export interface JobUpdateData {
  status?: JobStatus;
  progress?: number;
  message?: string;
  error?: string;
  result?: any;
}
