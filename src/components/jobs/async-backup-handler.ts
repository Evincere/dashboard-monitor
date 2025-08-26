import { apiUrl } from '@/lib/utils';

export async function initiateAsyncBackupDownload(
  backupId: string,
  backupName: string,
  downloadType: string
): Promise<string> {
  try {
    const response = await fetch(apiUrl('jobs'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'backup_download',
        data: {
          backupId,
          backupName,
          downloadType,
          requestedBy: 'dashboard-user'
        }
      }),
    });

    const result = await response.json();

    if (result.success) {
      return result.data.id; // Return job ID
    } else {
      throw new Error(result.error || 'Failed to initiate backup download');
    }
  } catch (error) {
    console.error('Error initiating async backup download:', error);
    throw error;
  }
}

export function triggerFileDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
